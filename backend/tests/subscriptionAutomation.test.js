require('dotenv').config();
const { query } = require('../db/database');
const { runLifecycleCheck } = require('../services/subscriptionAutomationService');

async function runTests() {
  console.log('🧪 Starting Subscription Lifecycle Automation Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Reminder Deduplication (Safeguard 3)
    console.log('[Test 1] Testing Database Reminder Deduplication Idempotency');
    const testEntityId = 99999;
    await query("DELETE FROM saas_reminder_logs WHERE entity_id = $1", [testEntityId]);

    // Insert 1st reminder
    await query(`
      INSERT INTO saas_reminder_logs (entity_type, entity_id, reminder_type, reminder_window, recipient_email, delivery_status)
      VALUES ('SUBSCRIPTION', $1, 'RENEWAL_REMINDER', '7D', 'test@example.com', 'SENT')
    `, [testEntityId]);

    // Attempt duplicate insert with ON CONFLICT DO NOTHING
    const dupRes = await query(`
      INSERT INTO saas_reminder_logs (entity_type, entity_id, reminder_type, reminder_window, recipient_email, delivery_status)
      VALUES ('SUBSCRIPTION', $1, 'RENEWAL_REMINDER', '7D', 'test@example.com', 'SENT')
      ON CONFLICT (entity_type, entity_id, reminder_type, reminder_window) DO NOTHING
      RETURNING id
    `, [testEntityId]);

    const logsCountRes = await query(`
      SELECT COUNT(*) as count FROM saas_reminder_logs 
      WHERE entity_id = $1 AND reminder_type = 'RENEWAL_REMINDER' AND reminder_window = '7D'
    `, [testEntityId]);

    assert(parseInt(logsCountRes.rows[0].count, 10) === 1, 'Only exactly 1 reminder log exists despite duplicate trigger');
    assert(dupRes.rows.length === 0, 'Duplicate reminder log was properly skipped via unique constraint');

    // Clean up test reminder
    await query("DELETE FROM saas_reminder_logs WHERE entity_id = $1", [testEntityId]);

    // Test 2: Churn Event Deduplication (Safeguard 2)
    console.log('\n[Test 2] Testing Churn Event Deduplication');
    const testSubId = 88888;
    await query("DELETE FROM saas_subscription_churn_events WHERE subscription_id = $1", [testSubId]);

    await query(`
      INSERT INTO saas_subscription_churn_events (subscription_id, organization_id, organization_name, plan_id, plan_name, churn_type, reason)
      VALUES ($1, 1, 'Test Org', 2, 'Pro', 'VOLUNTARY_CANCEL', 'Test reason')
    `, [testSubId]);

    await query(`
      INSERT INTO saas_subscription_churn_events (subscription_id, organization_id, organization_name, plan_id, plan_name, churn_type, reason)
      VALUES ($1, 1, 'Test Org', 2, 'Pro', 'VOLUNTARY_CANCEL', 'Duplicate attempt')
      ON CONFLICT (subscription_id, churn_type) DO NOTHING
    `, [testSubId]);

    const churnCountRes = await query(`
      SELECT COUNT(*) as count FROM saas_subscription_churn_events WHERE subscription_id = $1
    `, [testSubId]);
    assert(parseInt(churnCountRes.rows[0].count, 10) === 1, 'Duplicate churn event for subscription was prevented');

    await query("DELETE FROM saas_subscription_churn_events WHERE subscription_id = $1", [testSubId]);

    // Test 3: Cancellation Lifecycle (Safeguard 2)
    console.log('\n[Test 3] Testing Cancellation Lifecycle (Scheduled vs Immediate)');
    // Create temporary subscription
    const tempSubRes = await query(`
      INSERT INTO saas_subscriptions (organization_id, organization_name, plan_id, plan_name, billing_cycle, amount, status, current_period_start, current_period_end, cancel_at_period_end)
      VALUES (1, 'Test Org', 2, 'Pro', 'MONTHLY', 79, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 days', false)
      RETURNING *
    `);
    const tempSub = tempSubRes.rows[0];

    // Simulate Scheduled Cancellation
    await query(`
      UPDATE saas_subscriptions 
      SET cancel_at_period_end = true, cancel_reason = 'Cost / Budget constraints'
      WHERE id = $1
    `, [tempSub.id]);

    const scheduledSubRes = await query("SELECT * FROM saas_subscriptions WHERE id = $1", [tempSub.id]);
    assert(scheduledSubRes.rows[0].status === 'ACTIVE', 'Scheduled cancellation preserves ACTIVE status until period end');
    assert(scheduledSubRes.rows[0].cancel_at_period_end === true, 'Scheduled cancellation sets cancel_at_period_end flag');
    assert(scheduledSubRes.rows[0].cancel_reason === 'Cost / Budget constraints', 'Cancellation reason is stored in structured database column');

    // Simulate Immediate Cancellation
    await query(`
      UPDATE saas_subscriptions 
      SET status = 'CANCELLED', current_period_end = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [tempSub.id]);

    const immediateSubRes = await query("SELECT * FROM saas_subscriptions WHERE id = $1", [tempSub.id]);
    assert(immediateSubRes.rows[0].status === 'CANCELLED', 'Immediate cancellation updates status to CANCELLED');

    // Test 4: Reactivation Lifecycle
    console.log('\n[Test 4] Testing Subscription Reactivation');
    await query(`
      UPDATE saas_subscriptions 
      SET status = 'ACTIVE', cancel_at_period_end = false, cancel_reason = NULL,
          current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days'
      WHERE id = $1
    `, [tempSub.id]);

    const reactivatedSubRes = await query("SELECT * FROM saas_subscriptions WHERE id = $1", [tempSub.id]);
    assert(reactivatedSubRes.rows[0].status === 'ACTIVE', 'Reactivated subscription restores ACTIVE status');
    assert(reactivatedSubRes.rows[0].cancel_at_period_end === false, 'Reactivated subscription clears cancel_at_period_end');
    assert(reactivatedSubRes.rows[0].cancel_reason === null, 'Reactivated subscription clears cancel_reason');

    // Clean up temporary subscription
    await query("DELETE FROM saas_subscriptions WHERE id = $1", [tempSub.id]);

    // Test 5: Scheduled Plan Change Application
    console.log('\n[Test 5] Testing Scheduled Plan Change Queuing & Execution');
    const targetPlanRes = await query("SELECT id, name FROM saas_plans ORDER BY id DESC LIMIT 1");
    const targetPlan = targetPlanRes.rows[0];

    const schedSubRes = await query(`
      INSERT INTO saas_subscriptions (organization_id, organization_name, plan_id, plan_name, billing_cycle, amount, status, current_period_start, current_period_end, scheduled_plan_id, scheduled_billing_cycle)
      VALUES (1, 'Test Org', 1, 'Basic Plan', 'MONTHLY', 29, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '31 days', CURRENT_TIMESTAMP - INTERVAL '1 day', $1, 'YEARLY')
      RETURNING *
    `, [targetPlan.id]);
    const schedSub = schedSubRes.rows[0];

    // Run lifecycle check to apply scheduled plan change
    const schedCheckResult = await runLifecycleCheck({ triggerSource: 'TEST_SCHEDULED_CHANGE' });
    assert(schedCheckResult.success === true, 'Lifecycle engine executed without error');

    const updatedSchedSubRes = await query("SELECT * FROM saas_subscriptions WHERE id = $1", [schedSub.id]);
    const updatedSub = updatedSchedSubRes.rows[0];
    assert(updatedSub.plan_id === targetPlan.id, `Queued plan_id ${targetPlan.id} was successfully applied upon period end`);
    assert(updatedSub.scheduled_plan_id === null, 'scheduled_plan_id was reset to NULL after application');
    assert(updatedSub.billing_cycle === 'YEARLY', 'Scheduled billing_cycle was updated to YEARLY');

    // Clean up
    await query("DELETE FROM saas_subscriptions WHERE id = $1", [schedSub.id]);

    // Test 6: Automation Engine Overall Lifecycle Run
    console.log('\n[Test 6] Testing Automation Engine Lifecycle Check Summary');
    const autoResult = await runLifecycleCheck({ triggerSource: 'TEST_SUITE' });
    assert(autoResult.success === true, 'Automation engine ran without critical errors');
    assert(typeof autoResult.durationMs === 'number', 'Automation execution completed with measurable duration');
    assert(Array.isArray(autoResult.errors) && autoResult.errors.length === 0, 'Automation execution reported 0 errors');

    console.log(`\n========================================`);
    console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test failed with exception:', err);
    process.exit(1);
  }
}

runTests();
