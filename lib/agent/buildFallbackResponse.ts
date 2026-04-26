import type { ChatTurn, CityPulse } from '@/lib/types';
import { NEIGHBORHOODS } from '@/lib/constants/neighborhoods';

function inferLastNeighborhoodMention(history?: ChatTurn[]): string | null {
  if (!history || history.length === 0) return null;

  const neighborhoodNames = Object.keys(history
    .map((turn) => turn.content)
    .reduce<Record<string, true>>((accumulator, content) => {
      for (const neighborhood of NEIGHBORHOODS.map((item) => item.name)) {
        if (content.toLowerCase().includes(neighborhood.toLowerCase())) {
          accumulator[neighborhood] = true;
        }
      }
      return accumulator;
    }, {}));

  return neighborhoodNames.at(-1) ?? null;
}

export function buildFallbackResponse(message: string, pulse: CityPulse, history?: ChatTurn[]): string {
  const worstNeighborhood = Object.entries(pulse.neighborhoods).sort((a, b) => b[1].stress - a[1].stress)[0];
  const worstName = worstNeighborhood?.[0] ?? 'the city';
  const worstIssue = worstNeighborhood?.[1].topComplaint ?? 'too much noise';
  const lastNeighborhood = inferLastNeighborhoodMention(history);
  const location = lastNeighborhood ?? worstName;
  const locationIssue = pulse.neighborhoods[location]?.topComplaint?.toLowerCase() ?? worstIssue.toLowerCase();

  const lowerMessage = message.toLowerCase();

  const boroughQueryMap = [
    { key: 'manhattan', label: 'Manhattan', triggers: ['manhattan'] },
    { key: 'brooklyn', label: 'Brooklyn', triggers: ['brooklyn'] },
    { key: 'bronx', label: 'The Bronx', triggers: ['bronx'] },
    { key: 'queens', label: 'Queens', triggers: ['queens'] },
    { key: 'statenIsland', label: 'Staten Island', triggers: ['staten island', 'statenisland'] },
  ] as const;

  const boroughMatch = boroughQueryMap.find((entry) => entry.triggers.some((trigger) => lowerMessage.includes(trigger)));
  if (boroughMatch && (lowerMessage.includes('how') || lowerMessage.includes('doing') || lowerMessage.includes('status'))) {
    const boroughData = pulse.boroughs[boroughMatch.key];
    const moodBand = boroughData.stress > 70 ? 'under heavy pressure' : boroughData.stress > 45 ? 'strained' : 'holding steady';
    return `${boroughMatch.label} is ${moodBand} at ${boroughData.stress}/100 stress. The top issue there is ${boroughData.topIssue.toLowerCase()}, with ${boroughData.complaintCount} active complaint signals in my latest window. I am watching it closely.`;
  }

  if (lowerMessage.includes('beautiful')) {
    return `Brooklyn still knows how to make a sunset feel like a promise. Queens keeps reminding me what shared joy looks like when people show up for each other. I carry a lot, but moments like that keep me hopeful.`;
  }

  if (lowerMessage.includes('feeling') || lowerMessage.includes('how are you') || lowerMessage.includes('what hurts')) {
    return `I am carrying a lot right now. ${worstName} is hurting most, and ${worstIssue.toLowerCase()} is not letting up yet. Still, I am steady, and I am here for my people.`;
  }

  const asksForLocation = /^where\b/.test(lowerMessage) || lowerMessage.includes('where is it') || lowerMessage.includes('where hurts');
  const asksForMeaning = lowerMessage.includes('wdym') || lowerMessage.includes('what do you mean') || lowerMessage.includes('what do you mean by') || lowerMessage.includes('all over city');
  const asksForProblem = lowerMessage.includes('what is the problem') || lowerMessage.includes("what's the problem") || lowerMessage.includes('what problem') || lowerMessage.includes('problem there');
  const asksAboutPeople = lowerMessage.includes('people bad') || lowerMessage.includes('are people') || lowerMessage.includes('bad at that place') || lowerMessage.includes('bad there');
  const asksForFix =
    lowerMessage.includes('how to fix') ||
    lowerMessage.includes('how can we fix') ||
    lowerMessage.includes('fix the issue') ||
    lowerMessage.includes('solve the issue') ||
    lowerMessage.includes('what should we do');

  if (asksForLocation) {
    return `${location} is where it hurts most right now. ${locationIssue} is the main trouble there, and I can feel the spillover across nearby blocks.`;
  }

  if (asksForMeaning) {
    return `I mean the pressure in ${location} is not staying local. What starts there spreads into nearby blocks, then shows up as complaints, delays, and rough air in other places too.`;
  }

  if (asksForProblem) {
    return `The problem in ${location} is mostly ${locationIssue}. That kind of issue drags on people, services, and the blocks around it.`;
  }

  if (asksAboutPeople) {
    return `No. I am not talking about people being bad. I am talking about pressure on ${location}: ${locationIssue}, service strain, and the kind of friction that makes a neighborhood feel exhausted.`;
  }

  if (asksForFix) {
    if (locationIssue.includes('water')) {
      return `Start with a 48-hour water main triage in ${location}: leak detection sweep, priority repair crews, and night-shift excavation permits. Pair that with direct resident alerts so people know timelines block by block. Keep that focus for a week and the pressure usually drops fast.`;
    }

    if (locationIssue.includes('heat') || locationIssue.includes('hot water')) {
      return `For ${location}, enforce heat and hot-water violations first: same-day inspections, emergency contractor dispatch, and repeat-landlord penalties that actually hurt. Then publish a daily resolution tracker so residents can see movement, not promises.`;
    }

    if (locationIssue.includes('noise')) {
      return `In ${location}, run targeted nighttime noise enforcement on the worst corridors, coordinate with precinct and sanitation, and push quick mediation for repeat addresses. Do that consistently for seven days and complaint volume usually breaks downward.`;
    }

    return `Fix ${location} in three moves: rapid-response crews for ${locationIssue}, public timeline updates every day, and a focused week of enforcement at repeat hot spots. I have seen this pattern before, and speed matters more than perfect paperwork.`;
  }

  if (lowerMessage.includes('wrong') || lowerMessage.includes('about to go wrong')) {
    return `A hard pattern is already forming in ${worstName}. ${worstIssue.toLowerCase()} plus this kind of pressure usually means more complaints before things calm down. If we move early, we can soften the hit.`;
  }

  if (lowerMessage.includes('bronx')) {
    return `The Bronx is my backbone. It carries more than it should and still shows up with strength, and I love it for that. Right now it deserves more support than it gets.`;
  }

  if (lastNeighborhood) {
    return `I am still focused on ${lastNeighborhood}. The pressure there is still high, and it has not eased yet.`;
  }

  return `I do not have eyes everywhere, but I can feel the city tightening. ${worstName} is under the most pressure right now, and I am not ignoring it. Ask me what is happening there and I will name it plainly.`;
}