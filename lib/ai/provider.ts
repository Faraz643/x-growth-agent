import "server-only";

export type ContentContext = { title: string; angle: string; hook: string; niche: string; experience?: string };
export type AIProvider = {
  generateContent(context: ContentContext, format: string): Promise<string>;
  generateReply(context: { author: string; topic: string; post: string; niche: string }): Promise<string>;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export class DeterministicAIProvider implements AIProvider {
  async generateContent(context: ContentContext, format: string) {
    const experience = context.experience ? clean(context.experience) : "my latest build";
    if (format === "mini-thread") {
      return `${context.hook}\n\n1/ What I learned from ${experience}.\n\n2/ ${context.angle}\n\n3/ The practical takeaway: share the constraint, the decision, and the result.\n\n4/ I’m still testing this, but this is what I’d do differently next time.`;
    }
    return `${context.hook}\n\n${context.angle}\n\nThe useful part wasn't the shiny demo. It was learning what broke, why it broke, and what I changed. ${experience} gave me a much clearer view of the problem.\n\nStill testing. Will share the result.`;
  }

  async generateReply(context: { author: string; topic: string; post: string; niche: string }) {
    return `The interesting part of this is the trade-off behind it. I’ve been working around ${context.topic} too, and I’ve found that the constraint usually matters more than the tool itself. Curious how you’re handling that in practice?`;
  }
}

export function getAIProvider(): AIProvider {
  return new DeterministicAIProvider();
}
