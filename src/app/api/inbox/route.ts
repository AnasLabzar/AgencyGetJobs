import { NextResponse } from "next/server";
import { 
  scanGmailInbox, 
  sendReplyToRecruiter 
} from "@/agents/inbox-agent";
import { loadStore, saveStore } from "@/db/local-db";

export async function GET() {
  try {
    const store = loadStore();
    let messages = (store.inbox_messages || []).filter(m => !m.id.startsWith("msg_init_"));

    // If no messages stored yet, scan his real mailbox via IMAP automatically
    if (messages.length === 0) {
      const scanResult = await scanGmailInbox({ maxScan: 150, daysBack: 30 });
      if (scanResult.success) {
        messages = scanResult.messages;
      }
    }

    const interviewsCount = messages.filter(m => m.category === "INTERVIEW_INVITATION").length;
    const unreadCount = messages.filter(m => m.is_unread).length;
    const positiveInterestCount = messages.filter(m => m.category === "POSITIVE_INTEREST").length;
    const technicalTestsCount = messages.filter(m => m.category === "TECHNICAL_TEST").length;

    // Overdue messages: unread or unanswered received more than 48 hours ago
    const twoDaysAgo = Date.now() - 48 * 3600 * 1000;
    const overdueCount = messages.filter(m => 
      !m.is_replied && new Date(m.date).getTime() < twoDaysAgo
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalRecruiterMessages: messages.length,
        interviewsCount,
        unreadCount,
        positiveInterestCount,
        technicalTestsCount,
        overdueCount
      },
      messages
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // ACTION: SCAN GMAIL LIVE VIA IMAP
    if (action === "scan") {
      const maxScan = Number(body.maxScan) || 80;
      const daysBack = Number(body.daysBack) || 30;

      const result = await scanGmailInbox({ maxScan, daysBack });
      return NextResponse.json(result);
    }

    // ACTION: REPLY TO RECRUITER VIA SMTP
    if (action === "reply") {
      const { messageId, replyBody, customSubject } = body;
      if (!messageId || !replyBody) {
        return NextResponse.json({
          success: false,
          error: "messageId et replyBody sont requis"
        }, { status: 400 });
      }

      const result = await sendReplyToRecruiter(messageId, replyBody, customSubject);
      return NextResponse.json(result);
    }

    // ACTION: MARK AS READ
    if (action === "mark_read") {
      const { messageId } = body;
      const store = loadStore();
      const msg = (store.inbox_messages || []).find(m => m.id === messageId);
      if (msg) {
        msg.is_unread = false;
        saveStore(store);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
