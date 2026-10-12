const { query } = require('../db/database');
const {
  sendRenewalReminderEmail,
  sendTrialEndingEmail,
  sendPaymentGraceEmail
} = require('./emailService');

let isAutomationRunning = false;

/**
 * Fetch subscription policies from system_settings
 */
async function getSubscriptionSettings() {
  try {
    const res = await query("SELECT value FROM system_settings WHERE key = 'subscription_settings'");
    if (res.rows.length > 0) {
      const val = res.rows[0].value;
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return {
        defaultTrialDays: parseInt(parsed.defaultTrialDays, 10) || 14,
        gracePeriodDays: parseInt(parsed.gracePeriodDays, 10) || 5,
        renewalReminderDays: Array.isArray(parsed.renewalReminderDays) ? parsed.renewalReminderDays : [7, 3, 1],
        trialReminderDays: Array.isArray(parsed.trialReminderDays) ? parsed.trialReminderDays : [3, 1],
        autoSuspendAfterGrace: parsed.autoSuspendAfterGrace !== false
      };
    }
  } catch (err) {
    console.warn('[AUTOMATION_SETTINGS_FALLBACK] Using default settings:', err.message);
  }
  return {
    defaultTrialDays: 14,
    gracePeriodDays: 5,
    renewalReminderDays: [7, 3, 1],
    trialReminderDays: [3, 1],
    autoSuspendAfterGrace: true
  };
}

/**
 * Record a reminder log with DB unique constraint to guarantee idempotency
 */
async function recordReminderLog({ entityType, entityId, organizationId, reminderType, reminderWindow, recipientEmail, deliveryStatus, errorMessage }) {
  try {
    await query(`
      INSERT INTO saas_reminder_logs (
        entity_type, entity_id, organization_id, reminder_type, reminder_window,
        recipient_email, delivery_status, error_message, sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (entity_type, entity_id, reminder_type, reminder_window) 
      DO NOTHING
    `, [entityType, entityId, organizationId, reminderType, reminderWindow, recipientEmail, deliveryStatus, errorMessage]);
    return true;
  } catch (err) {
    console.error('[REMINDER_LOG_ERROR]', err.message);
    return false;
  }
}

/**
 * Record a churn event idempotently
 */
async function recordChurnEvent({ subscriptionId, organizationId, organizationName, planId, planName, churnType, reason }) {
  try {
    await query(`
      INSERT INTO saas_subscription_churn_events (
        subscription_id, organization_id, organization_name, plan_id, plan_name, churn_type, reason, churn_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (subscription_id, churn_type) DO NOTHING
    `, [subscriptionId, organizationId, organizationName, planId, planName, churnType, reason || 'Unspecified']);
  } catch (err) {
    console.error('[CHURN_EVENT_LOG_ERROR]', err.message);
  }
}

/**
 * 1. Process Automatic Renewal Reminders
 */
async function processRenewalReminders(settings, summary) {
  for (const days of settings.renewalReminderDays) {
    const dayInt = parseInt(days, 10);
    const prevDayInt = Math.max(0, dayInt - 1);
    const windowName = `${days}D`;

    const subsRes = await query(`
      SELECT s.*, o.email as organization_email, o.name as org_display_name
      FROM saas_subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      WHERE s.status = 'ACTIVE'
        AND COALESCE(s.cancel_at_period_end, false) = false
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end <= (CURRENT_TIMESTAMP + ($1::text || ' days')::interval)
        AND s.current_period_end > (CURRENT_TIMESTAMP + ($2::text || ' days')::interval)
        AND NOT EXISTS (
          SELECT 1 FROM saas_reminder_logs rl
          WHERE rl.entity_type = 'SUBSCRIPTION'
            AND rl.entity_id = s.id
            AND rl.reminder_type = 'RENEWAL_REMINDER'
            AND rl.reminder_window = $3
        )
    `, [dayInt, prevDayInt, windowName]);

    for (const sub of subsRes.rows) {
      summary.processedRenewals++;
      const targetEmail = sub.organization_email;
      if (!targetEmail) continue;

      const emailResult = await sendRenewalReminderEmail({
        to: targetEmail,
        organizationName: sub.org_display_name || sub.organization_name,
        planName: sub.plan_name,
        amount: sub.amount,
        billingCycle: sub.billing_cycle,
        daysRemaining: days,
        renewalDate: sub.current_period_end
      });

      await recordReminderLog({
        entityType: 'SUBSCRIPTION',
        entityId: sub.id,
        organizationId: sub.organization_id,
        reminderType: 'RENEWAL_REMINDER',
        reminderWindow: windowName,
        recipientEmail: targetEmail,
        deliveryStatus: emailResult.success ? 'SENT' : 'FAILED',
        errorMessage: emailResult.error || null
      });

      if (emailResult.success) {
        summary.sentRenewalReminders++;
      }

      // Add in-app notification
      await query(`
        INSERT INTO saas_notifications (title, message, type)
        VALUES ($1, $2, 'INFO')
      `, [
        `Renewal Notice Sent: ${sub.organization_name}`,
        `Upcoming renewal reminder for plan ${sub.plan_name} (in ${days} days) dispatched to ${targetEmail}.`
      ]);
    }
  }
}

/**
 * 2. Process Free Trial Ending Alerts & Expiration
 */
async function processTrialAlertsAndExpiry(settings, summary) {
  // A. Trial Ending Alerts
  for (const days of settings.trialReminderDays) {
    const dayInt = parseInt(days, 10);
    const prevDayInt = Math.max(0, dayInt - 1);
    const windowName = `${days}D`;

    const trialsRes = await query(`
      SELECT o.*, p.name as plan_tier_name
      FROM organizations o
      LEFT JOIN saas_plans p ON o.plan_id = p.id
      WHERE o.status = 'TRIAL'
        AND o.trial_ends_at IS NOT NULL
        AND o.trial_ends_at <= (CURRENT_TIMESTAMP + ($1::text || ' days')::interval)
        AND o.trial_ends_at > (CURRENT_TIMESTAMP + ($2::text || ' days')::interval)
        AND NOT EXISTS (
          SELECT 1 FROM saas_reminder_logs rl
          WHERE rl.entity_type = 'TRIAL'
            AND rl.entity_id = o.id
            AND rl.reminder_type = 'TRIAL_ENDING'
            AND rl.reminder_window = $3
        )
    `, [dayInt, prevDayInt, windowName]);

    for (const org of trialsRes.rows) {
      summary.processedTrials++;
      const targetEmail = org.email;
      if (!targetEmail) continue;

      const emailResult = await sendTrialEndingEmail({
        to: targetEmail,
        organizationName: org.name,
        planName: org.plan_tier_name || org.plan_name || 'Pro',
        daysRemaining: days,
        expiryDate: org.trial_ends_at
      });

      await recordReminderLog({
        entityType: 'TRIAL',
        entityId: org.id,
        organizationId: org.id,
        reminderType: 'TRIAL_ENDING',
        reminderWindow: windowName,
        recipientEmail: targetEmail,
        deliveryStatus: emailResult.success ? 'SENT' : 'FAILED',
        errorMessage: emailResult.error || null
      });

      if (emailResult.success) {
        summary.sentTrialAlerts++;
      }

      await query(`
        INSERT INTO saas_notifications (title, message, type)
        VALUES ($1, $2, 'WARNING')
      `, [
        `Trial Ending Alert: ${org.name}`,
        `Trial for ${org.name} ends in ${days} day(s). Notification sent to ${targetEmail}.`
      ]);
    }
  }

  // B. Process Expired Trials
  const expiredTrialsRes = await query(`
    SELECT o.*, s.id as sub_id, s.plan_id as sub_plan_id, s.plan_name as sub_plan_name
    FROM organizations o
    LEFT JOIN saas_subscriptions s ON s.organization_id = o.id AND s.status = 'TRIAL'
    WHERE o.status = 'TRIAL'
      AND o.trial_ends_at IS NOT NULL
      AND o.trial_ends_at < CURRENT_TIMESTAMP
  `);

  for (const org of expiredTrialsRes.rows) {
    await query("UPDATE organizations SET status = 'EXPIRED' WHERE id = $1", [org.id]);
    if (org.sub_id) {
      await query("UPDATE saas_subscriptions SET status = 'EXPIRED' WHERE id = $1", [org.sub_id]);
      await recordChurnEvent({
        subscriptionId: org.sub_id,
        organizationId: org.id,
        organizationName: org.name,
        planId: org.sub_plan_id || org.plan_id || 1,
        planName: org.sub_plan_name || org.plan_name || 'Basic',
        churnType: 'EXPIRED_NO_RENEWAL',
        reason: 'Free evaluation trial elapsed without paid plan conversion'
      });
    }

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES (1, 'Automation Engine', $1, 'TRIAL_EXPIRED', 'TRIALS', $2)
    `, [org.id, `Trial elapsed for ${org.name}; transitioned to EXPIRED.`]);
  }
}

/**
 * 3. Process Failed Payments, Grace Periods, and Overdue Suspension
 */
async function processPaymentGraceAndSuspension(settings, summary) {
  const graceDays = settings.gracePeriodDays || 5;

  // A. Identify unpaid invoices that have passed their due_date
  const overdueInvoicesRes = await query(`
    SELECT i.*, o.email as organization_email, s.id as sub_id, s.plan_id, s.status as sub_status, s.grace_period_end
    FROM saas_invoices i
    JOIN organizations o ON i.organization_id = o.id
    LEFT JOIN saas_subscriptions s ON s.organization_id = o.id AND s.status IN ('ACTIVE', 'GRACE_PERIOD', 'PAST_DUE')
    WHERE i.status IN ('PENDING', 'OVERDUE')
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_TIMESTAMP
  `);

  for (const inv of overdueInvoicesRes.rows) {
    summary.processedGracePeriods++;
    // Mark invoice as OVERDUE if still PENDING
    if (inv.status === 'PENDING') {
      await query("UPDATE saas_invoices SET status = 'OVERDUE' WHERE id = $1", [inv.id]);
    }

    if (!inv.sub_id) continue;

    // Calculate effective grace period end date
    const calculatedGraceEnd = new Date(new Date(inv.due_date).getTime() + graceDays * 86400000);
    const isGraceExpired = calculatedGraceEnd < new Date();

    if (!isGraceExpired) {
      // In Grace Period
      if (inv.sub_status !== 'GRACE_PERIOD') {
        await query(`
          UPDATE saas_subscriptions
          SET status = 'GRACE_PERIOD', grace_period_end = $1
          WHERE id = $2
        `, [calculatedGraceEnd, inv.sub_id]);

        // Send grace period warning email
        if (inv.organization_email) {
          const emailRes = await sendPaymentGraceEmail({
            to: inv.organization_email,
            organizationName: inv.organization_name,
            planName: inv.plan_name,
            amount: inv.amount,
            invoiceNumber: inv.invoice_number,
            gracePeriodDays: graceDays,
            gracePeriodEnd: calculatedGraceEnd
          });

          await recordReminderLog({
            entityType: 'SUBSCRIPTION',
            entityId: inv.sub_id,
            organizationId: inv.organization_id,
            reminderType: 'PAYMENT_GRACE_NOTICE',
            reminderWindow: 'ACTIVE_GRACE',
            recipientEmail: inv.organization_email,
            deliveryStatus: emailRes.success ? 'SENT' : 'FAILED',
            errorMessage: emailRes.error || null
          });
        }

        await query(`
          INSERT INTO saas_notifications (title, message, type)
          VALUES ($1, $2, 'WARNING')
        `, [
          `Payment Overdue: ${inv.organization_name}`,
          `Invoice ${inv.invoice_number} is overdue. Tenant entered ${graceDays}-day grace period ending ${calculatedGraceEnd.toLocaleDateString('en-IN')}.`
        ]);
      }
    } else {
      // Grace period expired! Auto-suspend tenant if configured
      if (settings.autoSuspendAfterGrace && inv.sub_status !== 'SUSPENDED') {
        await query("UPDATE saas_subscriptions SET status = 'SUSPENDED' WHERE id = $1", [inv.sub_id]);
        await query(`
          UPDATE organizations 
          SET status = 'SUSPENDED', suspension_reason = $1 
          WHERE id = $2
        `, [`Grace period expired on overdue invoice ${inv.invoice_number}`, inv.organization_id]);

        // Record churn event
        await recordChurnEvent({
          subscriptionId: inv.sub_id,
          organizationId: inv.organization_id,
          organizationName: inv.organization_name,
          planId: inv.plan_id || 1,
          planName: inv.plan_name,
          churnType: 'PAYMENT_FAILURE',
          reason: `Grace period (${graceDays} days) expired for overdue invoice ${inv.invoice_number}`
        });

        summary.suspendedAccounts++;

        await query(`
          INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
          VALUES (1, 'Automation Engine', $1, 'SUSPEND_TENANT_GRACE_EXPIRED', 'SUBSCRIPTIONS', $2)
        `, [inv.organization_id, `Account automatically suspended after ${graceDays} day grace period on invoice ${inv.invoice_number}.`]);

        await query(`
          INSERT INTO saas_notifications (title, message, type)
          VALUES ($1, $2, 'ERROR')
        `, [
          `Tenant Suspended: ${inv.organization_name}`,
          `Account suspended following grace period expiry on overdue invoice ${inv.invoice_number}.`
        ]);
      }
    }
  }
}

/**
 * 4. Process Scheduled Plan Changes & Scheduled Cancellations
 */
async function processScheduledChangesAndCancellations(summary) {
  // A. Scheduled Plan Changes
  const scheduledSubsRes = await query(`
    SELECT s.*, p.name as target_plan_name, p.price_monthly as target_monthly, p.price_yearly as target_yearly
    FROM saas_subscriptions s
    JOIN saas_plans p ON s.scheduled_plan_id = p.id
    WHERE s.scheduled_plan_id IS NOT NULL
      AND s.current_period_end <= CURRENT_TIMESTAMP
  `);

  for (const sub of scheduledSubsRes.rows) {
    const targetCycle = (sub.scheduled_billing_cycle || sub.billing_cycle || 'MONTHLY').toUpperCase();
    const newAmount = targetCycle === 'YEARLY'
      ? parseFloat(sub.target_yearly || 0)
      : parseFloat(sub.target_monthly || 0);
    const durationDays = targetCycle === 'YEARLY' ? 365 : 30;

    await query(`
      UPDATE saas_subscriptions
      SET plan_id = $1, plan_name = $2, billing_cycle = $3, amount = $4,
          status = 'ACTIVE', current_period_start = CURRENT_TIMESTAMP,
          current_period_end = CURRENT_TIMESTAMP + ($5::text || ' days')::interval,
          scheduled_plan_id = NULL, scheduled_billing_cycle = NULL, scheduled_change_date = NULL
      WHERE id = $6
    `, [sub.scheduled_plan_id, sub.target_plan_name, targetCycle, newAmount, durationDays, sub.id]);

    await query(`
      UPDATE organizations
      SET plan_id = $1, plan_name = $2, status = 'ACTIVE'
      WHERE id = $3
    `, [sub.scheduled_plan_id, sub.target_plan_name, sub.organization_id]);

    // Create renewal invoice for the newly applied plan
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    await query(`
      INSERT INTO saas_invoices (invoice_number, organization_id, organization_name, plan_name, amount, currency, status, billing_period, due_date, paid_at)
      VALUES ($1, $2, $3, $4, $5, 'INR', 'PAID', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      invNum,
      sub.organization_id,
      sub.organization_name,
      sub.target_plan_name,
      newAmount,
      `${targetCycle} Plan Renewal`
    ]);

    summary.appliedScheduledPlanChanges++;

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES (1, 'Automation Engine', $1, 'APPLY_SCHEDULED_PLAN_CHANGE', 'SUBSCRIPTIONS', $2)
    `, [sub.organization_id, `Applied scheduled transition for ${sub.organization_name} to ${sub.target_plan_name} (${targetCycle}) at ₹${newAmount}.`]);

    await query(`
      INSERT INTO saas_notifications (title, message, type)
      VALUES ($1, $2, 'SUCCESS')
    `, [
      `Scheduled Plan Transition Applied: ${sub.organization_name}`,
      `Subscription transitioned to plan ${sub.target_plan_name} upon cycle renewal.`
    ]);
  }

  // B. Scheduled Cancellations effective at period end
  const scheduledCancelsRes = await query(`
    SELECT * FROM saas_subscriptions
    WHERE cancel_at_period_end = true
      AND status != 'CANCELLED'
      AND current_period_end <= CURRENT_TIMESTAMP
  `);

  for (const sub of scheduledCancelsRes.rows) {
    await query("UPDATE saas_subscriptions SET status = 'CANCELLED' WHERE id = $1", [sub.id]);
    await recordChurnEvent({
      subscriptionId: sub.id,
      organizationId: sub.organization_id,
      organizationName: sub.organization_name,
      planId: sub.plan_id,
      planName: sub.plan_name,
      churnType: 'VOLUNTARY_CANCEL',
      reason: sub.cancel_reason || 'Cancellation scheduled at billing period end'
    });

    summary.processedCancellations++;

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES (1, 'Automation Engine', $1, 'EXECUTE_SCHEDULED_CANCELLATION', 'SUBSCRIPTIONS', $2)
    `, [sub.organization_id, `Scheduled period-end cancellation executed for ${sub.organization_name}.`]);
  }
}

/**
 * Main Lifecycle Check Routine
 * Idempotent, locked against concurrent execution
 */
async function runLifecycleCheck({ triggerSource = 'SCHEDULED' } = {}) {
  if (isAutomationRunning) {
    return {
      success: false,
      message: 'Automation lifecycle execution is already in progress. Skipped overlapping run.',
      skipped: true
    };
  }

  isAutomationRunning = true;
  const startTime = Date.now();
  const summary = {
    triggerSource,
    startedAt: new Date().toISOString(),
    processedRenewals: 0,
    sentRenewalReminders: 0,
    processedTrials: 0,
    sentTrialAlerts: 0,
    processedGracePeriods: 0,
    suspendedAccounts: 0,
    appliedScheduledPlanChanges: 0,
    processedCancellations: 0,
    errors: []
  };

  try {
    const settings = await getSubscriptionSettings();

    // Step 1: Automatic renewal reminders
    await processRenewalReminders(settings, summary).catch(err => {
      console.error('[AUTOMATION_ERROR] Renewal reminders failed:', err);
      summary.errors.push(`Renewal reminders: ${err.message}`);
    });

    // Step 2: Free trial alerts and expirations
    await processTrialAlertsAndExpiry(settings, summary).catch(err => {
      console.error('[AUTOMATION_ERROR] Trial processing failed:', err);
      summary.errors.push(`Trial processing: ${err.message}`);
    });

    // Step 3: Payment grace periods and overdue rules
    await processPaymentGraceAndSuspension(settings, summary).catch(err => {
      console.error('[AUTOMATION_ERROR] Grace period processing failed:', err);
      summary.errors.push(`Grace period processing: ${err.message}`);
    });

    // Step 4: Scheduled plan changes and cancellations
    await processScheduledChangesAndCancellations(summary).catch(err => {
      console.error('[AUTOMATION_ERROR] Scheduled changes processing failed:', err);
      summary.errors.push(`Scheduled changes: ${err.message}`);
    });

    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;
    summary.success = summary.errors.length === 0;

    console.log(`[AUTOMATION_ENGINE_RUN] Trigger: ${triggerSource} | Duration: ${summary.durationMs}ms | Errors: ${summary.errors.length}`);
    return summary;
  } catch (err) {
    console.error('[CRITICAL_AUTOMATION_ERROR]', err);
    summary.errors.push(`Critical failure: ${err.message}`);
    summary.success = false;
    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;
    return summary;
  } finally {
    isAutomationRunning = false;
  }
}

let scheduledInterval = null;

/**
 * Start periodic automated worker timer (runs every hour in background)
 */
function startAutomationWorker(intervalMs = 3600000) {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
  }

  console.log(`⏱️ Subscription Lifecycle Automation Worker registered (interval: ${Math.round(intervalMs / 60000)}m)`);
  // Delay first run by 15 seconds after server start to allow all schemas and DB connections to settle
  setTimeout(() => {
    runLifecycleCheck({ triggerSource: 'WORKER_STARTUP' }).catch(e => console.error(e));
  }, 15000);

  scheduledInterval = setInterval(() => {
    runLifecycleCheck({ triggerSource: 'WORKER_INTERVAL' }).catch(e => console.error(e));
  }, intervalMs);
}

function stopAutomationWorker() {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
  }
}

module.exports = {
  runLifecycleCheck,
  startAutomationWorker,
  stopAutomationWorker,
  getSubscriptionSettings
};
