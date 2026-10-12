// In-memory support ticket threads with persistent state during runtime
let tickets = [
  {
    id: 1,
    ticket_number: 'TCK-0001',
    organizationId: 1,
    organizationName: 'Solaris Cloud Solutions',
    subject: 'Custom domain SSL renewal inquiry',
    status: 'OPEN',
    priority: 'HIGH',
    createdAt: '2026-10-06T10:30:00Z',
    messages: [
      { id: 101, sender: 'Alex Rivera', role: 'Tenant Admin', text: 'Our custom wildcard certificate requires manual DNS TXT verification token for automatic renewal.', timestamp: '2026-10-06T10:30:00Z' }
    ]
  },
  {
    id: 2,
    ticket_number: 'TCK-0002',
    organizationId: 3,
    organizationName: 'NexGen Robotics',
    subject: 'API Rate limit expansion request',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    createdAt: '2026-10-05T14:15:00Z',
    messages: [
      { id: 201, sender: 'David Zhang', role: 'Tenant Admin', text: 'We are conducting load testing this weekend and request 50k extra API quota.', timestamp: '2026-10-05T14:15:00Z' },
      { id: 202, sender: 'Mohit (Super Admin)', role: 'Super Admin', text: 'Quota extended to 150,000 requests until Monday.', timestamp: '2026-10-05T16:00:00Z' }
    ]
  },
  {
    id: 3,
    ticket_number: 'TCK-0003',
    organizationId: 4,
    organizationName: 'Zenith Logistics',
    subject: 'SSO SAML configuration assistance',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    createdAt: '2026-10-07T08:00:00Z',
    messages: [
      { id: 301, sender: 'Priya Sharma', role: 'Tenant Admin', text: 'Need the IdP Metadata URL for Azure Active Directory integration.', timestamp: '2026-10-07T08:00:00Z' }
    ]
  }
];

function formatTicket(t) {
  return {
    ...t,
    ticket_number: t.ticket_number || `TCK-${t.id.toString().padStart(4, '0')}`,
    organization_id: t.organizationId || t.organization_id,
    organization_name: t.organizationName || t.organization_name,
    user_name: t.messages && t.messages[0] ? t.messages[0].sender : 'Tenant Admin',
    created_at: t.createdAt || t.created_at
  };
}

exports.getTickets = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = (req.query.status || 'ALL').toUpperCase();
  const search = (req.query.search || '').trim().toLowerCase();

  let filtered = tickets;
  if (status !== 'ALL') {
    filtered = filtered.filter(t => t.status === status);
  }
  if (search) {
    filtered = filtered.filter(t => 
      (t.subject && t.subject.toLowerCase().includes(search)) ||
      (t.organizationName && t.organizationName.toLowerCase().includes(search)) ||
      (t.ticket_number && t.ticket_number.toLowerCase().includes(search))
    );
  }

  const paginated = filtered.slice((page - 1) * limit, page * limit).map(formatTicket);

  return res.json({
    success: true,
    data: {
      items: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1
      }
    }
  });
};

exports.getTicketById = async (req, res) => {
  const ticket = tickets.find(t => t.id === parseInt(req.params.id, 10));
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  return res.json({ success: true, data: formatTicket(ticket) });
};

exports.replyTicket = async (req, res) => {
  const { message, status } = req.body;
  const ticket = tickets.find(t => t.id === parseInt(req.params.id, 10));
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  ticket.messages.push({
    id: Date.now(),
    sender: req.user?.name || 'Super Admin',
    role: 'Super Admin',
    text: message,
    timestamp: new Date().toISOString()
  });

  if (status) {
    ticket.status = status;
  }

  return res.json({ success: true, message: 'Reply sent successfully', data: formatTicket(ticket) });
};
