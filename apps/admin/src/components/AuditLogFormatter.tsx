import React from 'react';

export function formatAuditLogMessage(log: any) {
    const { action, entity_type, before, after } = log;

    const data = after || before || {};
    let entityName = data.name || data.title || data.invoice_number || data.hero_title || '';

    if (entity_type === 'ledger_entry' || entity_type === 'ledger' || entity_type === 'collection') {
        entityName = data.category || data.type || (data.amount ? `৳${data.amount}` : '');
    } else if (entity_type === 'staff' || entity_type === 'user' || entity_type === 'profile') {
        entityName = data.name || data.email || '';
    }

    const renderName = (name: string) => <span className="font-semibold text-foreground">"{name}"</span>;

    // Specific value change tracking
    if (action === 'update_company' && before?.name && after?.name && before.name !== after.name) {
        return <span>updated company from <span className="text-red-500/80 line-through">"{before.name}"</span> to {renderName(after.name)}</span>;
    }
    if (action === 'update_project' && before?.title && after?.title && before.title !== after.title) {
        return <span>updated project from <span className="text-red-500/80 line-through">"{before.title}"</span> to {renderName(after.title)}</span>;
    }

    // Handle various specific actions
    if (action === 'staff_invited') return <span>invited staff {entityName && renderName(entityName)}</span>;
    if (action === 'staff_deactivated') return <span>deactivated staff {entityName && renderName(entityName)}</span>;
    if (action === 'staff_activated') return <span>activated staff {entityName && renderName(entityName)}</span>;
    if (action === 'role_changed') return <span>changed role for {entityName && renderName(entityName)}</span>;
    if (action === 'role_created') return <span>created role {entityName && renderName(entityName)}</span>;
    if (action === 'role_deleted') return <span>deleted role {entityName && renderName(entityName)}</span>;
    if (action === 'invoice_sent') return <span>sent invoice {entityName && renderName(entityName)}</span>;
    if (action === 'media_uploaded') return <span>uploaded media for {entityName && renderName(entityName)}</span>;

    // General verb parsing
    const parts = action.split('_');
    const actionType = parts[0];

    let verb = actionType;
    if (actionType === 'create') verb = 'created';
    else if (actionType === 'update') verb = 'updated';
    else if (actionType === 'delete') verb = 'deleted';
    else if (actionType === 'send') verb = 'sent';

    let typeStr = entity_type.replace(/_/g, ' ');
    if (entity_type === 'ledger' || entity_type === 'ledger_entry') {
        typeStr = 'expense';
    } else if (entity_type === 'collection') {
        typeStr = 'collection';
    } else if (entity_type === 'lead') {
        typeStr = 'contact form';
    }

    if (entityName) {
        return <span>{verb} {typeStr} {renderName(entityName)}</span>;
    }

    return <span>{verb} {typeStr}</span>;
}
