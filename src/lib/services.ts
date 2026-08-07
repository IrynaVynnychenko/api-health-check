import type { MonitoredService } from "./types";

export const MONITORED_SERVICES: MonitoredService[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Payments & billing API",
    category: "Payments",
    color: "#635BFF",
    healthUrl: "https://www.stripestatus.com/api/v2/status.json",
    statuspageUrl: "https://www.stripestatus.com/api/v2/status.json",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "LLM & embeddings API",
    category: "AI",
    color: "#10A37F",
    healthUrl: "https://status.openai.com/api/v2/status.json",
    statuspageUrl: "https://status.openai.com/api/v2/status.json",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repos, Actions & API",
    category: "DevTools",
    color: "#24292F",
    healthUrl: "https://www.githubstatus.com/api/v2/status.json",
    statuspageUrl: "https://www.githubstatus.com/api/v2/status.json",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Transactional email API",
    category: "Messaging",
    color: "#000000",
    healthUrl: "https://resend-status.com/api/v2/status.json",
    statuspageUrl: "https://resend-status.com/api/v2/status.json",
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    description: "CDN & edge network",
    category: "Infrastructure",
    color: "#F38020",
    healthUrl: "https://www.cloudflarestatus.com/api/v2/status.json",
    statuspageUrl: "https://www.cloudflarestatus.com/api/v2/status.json",
  },
];

export function getServiceById(id: string): MonitoredService | undefined {
  return MONITORED_SERVICES.find((service) => service.id === id);
}
