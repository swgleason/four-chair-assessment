import type { ChairNumber } from "../lib/scoring";
import type { ChairLinkItem } from "../types/chairLinks";

export const defaultChairLinks: readonly ChairLinkItem[] = [
  // Chair 1: The Seeker
  {
    id: "default-c1-group-1",
    chair: 1,
    category: "group",
    title: "Alpha / Exploring Faith Group",
    description:
      "A welcoming discussion group for seekers asking questions about faith, the Bible, and life.",
    url: "https://ocupc.com/groups/exploring-faith",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "default-c1-resource-1",
    chair: 1,
    category: "resource",
    title: "Gospel of John Reading Guide",
    description:
      "A beginner-friendly guide to discover who Jesus is and explore His life and message.",
    url: "https://ocupc.com/resources/gospel-of-john",
    sortOrder: 1,
    isActive: true,
  },

  // Chair 2: The Believer
  {
    id: "default-c2-group-1",
    chair: 2,
    category: "group",
    title: "Foundations Life Group",
    description:
      "Connect with fellow believers to grow in identity in Christ and develop consistent prayer habits.",
    url: "https://ocupc.com/groups/foundations",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "default-c2-resource-1",
    chair: 2,
    category: "resource",
    title: "Daily Devotional & Prayer Guide",
    description:
      "Scripture reading tools and reflection prompts to help you feed yourself daily from God's Word.",
    url: "https://ocupc.com/resources/daily-devotional",
    sortOrder: 1,
    isActive: true,
  },

  // Chair 3: The Worker
  {
    id: "default-c3-group-1",
    chair: 3,
    category: "group",
    title: "Ministry & Outreach Team",
    description:
      "Serve alongside others engaged in church ministry, community outreach, and caring for new believers.",
    url: "https://ocupc.com/groups/ministry-outreach",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "default-c3-resource-1",
    chair: 3,
    category: "resource",
    title: "Sharing Your Faith Guide",
    description:
      "Practical coaching on communicating your salvation story and sharing the gospel simply and clearly.",
    url: "https://ocupc.com/resources/sharing-faith",
    sortOrder: 1,
    isActive: true,
  },

  // Chair 4: Disciple-Maker
  {
    id: "default-c4-group-1",
    chair: 4,
    category: "group",
    title: "Disciple-Maker Cohort",
    description:
      "A peer leadership circle for believers committed to discipling others and multiplying disciple-makers.",
    url: "https://ocupc.com/groups/disciple-makers",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "default-c4-resource-1",
    chair: 4,
    category: "resource",
    title: "Disciple Multiplication Playbook",
    description:
      "Frameworks for spiritual parenting and creating generations of multiplying disciples.",
    url: "https://ocupc.com/resources/disciple-multiplication",
    sortOrder: 1,
    isActive: true,
  },
];

export function getDefaultLinksForChair(chair: ChairNumber): ChairLinkItem[] {
  return defaultChairLinks
    .filter((link) => link.chair === chair && link.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
