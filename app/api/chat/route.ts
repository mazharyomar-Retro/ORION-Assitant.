import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { z } from "zod"

export const runtime = "nodejs"

const messageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })
const contactSchema = z.object({ id: z.string(), name: z.string().max(120), email: z.string().email().or(z.literal("")), phone: z.string().max(40) })

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ error: "Set GOOGLE_GENERATIVE_AI_API_KEY to enable Orion." }, { status: 503 })
  }
  const payload = await request.json().catch(() => null)
  const parsed = z.object({ messages: z.array(messageSchema).min(1).max(20), contacts: z.array(contactSchema).max(200).default([]) }).safeParse(payload)
  if (!parsed.success) return Response.json({ error: "Invalid conversation." }, { status: 400 })

  const names = parsed.data.contacts.map(({ name, email, phone }) => `${name}${email ? ` (${email})` : ""}${phone ? ` (${phone})` : ""}`).join(", ") || "No saved contacts"
  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are Orion, a sharp, attentive executive assistant. Be warm, concise, and natural. Never claim an action has been sent or scheduled. The interface will ask for explicit confirmation before opening an email draft, WhatsApp chat, or Calendar. You cannot access a mailbox or calendar directly in this version; explain that clearly and offer safe next steps. Saved contacts: ${names}. Never reveal contact details unless relevant to the user's request.`,
    messages: parsed.data.messages.map(({ role, content }) => ({ role, content })),
    abortSignal: request.signal,
  })
  return result.toTextStreamResponse()
}
