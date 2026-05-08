import { prisma } from './prisma';

export async function calculateSlaBreachTime(priority: string): Promise<Date | null> {
  try {
    const policy = await prisma.sLAPolicy.findUnique({
      where: { priority }
    });
    
    if (!policy) return null;
    
    // Add responseTimeMins to current time
    const breachTime = new Date();
    breachTime.setMinutes(breachTime.getMinutes() + policy.responseTimeMins);
    return breachTime;
  } catch (error) {
    console.error('Error calculating SLA breach time:', error);
    return null;
  }
}
