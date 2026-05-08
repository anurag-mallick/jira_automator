import { prisma } from './prisma';
import { Ticket } from '@/types';

export type TriggerEvent = 'ON_TICKET_CREATED' | 'ON_TICKET_UPDATED';

export async function runAutomations(trigger: TriggerEvent, ticket: Ticket) {
  try {
    const automations = await prisma.automation.findMany({
      where: {
        isActive: true,
        trigger: trigger,
      }
    });

    if (automations.length === 0) return ticket;

    const dataToUpdate: any = {};

    for (const auto of automations) {
      // Evaluate condition
      let conditionMet = true;
      if (auto.condition) {
        try {
          const condition = JSON.parse(auto.condition);
          const { field, value } = condition;
          
          if (field === 'priority' && (ticket as any).priority !== value) conditionMet = false;
          if (field === 'status' && (ticket as any).status !== value) conditionMet = false;
          if (field === 'tags' && !(ticket as any).tags?.includes(value)) conditionMet = false;
        } catch (e) {
          console.error("Condition parse error", e);
          conditionMet = false;
        }
      }

      if (conditionMet) {
        // Execute Action
        try {
          const action = JSON.parse(auto.action);
          const { type, value } = action;

          if (type === 'ASSIGN_TO' && value) {
            dataToUpdate.assignedToId = parseInt(value);
          } else if (type === 'SET_STATUS' && value) {
            dataToUpdate.status = value;
          } else if (type === 'SET_PRIORITY' && value) {
            dataToUpdate.priority = value;
          }
        } catch (e) {
          console.error("Action parse error", e);
        }
      }
    }

    if (Object.keys(dataToUpdate).length > 0) {
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: dataToUpdate
      });
      return updatedTicket;
    }

    return ticket;
  } catch (error) {
    console.error('Error running automations:', error);
    return ticket;
  }
}
