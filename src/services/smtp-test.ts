import { verifySMTP, sendEmail, getSMTPConfig } from "./email";

/**
 * Test SMTP connection and send a test email
 */
export async function testSMTPConnection(): Promise<{
  success: boolean;
  message: string;
  config?: any;
}> {
  console.log("\n[SMTP TEST] Testing SMTP connection...");

  const config = getSMTPConfig();
  console.log(`[SMTP TEST] Host: ${config.host}:${config.port}`);
  console.log(`[SMTP TEST] Secure: ${config.secure}`);
  console.log(`[SMTP TEST] User: ${config.auth.user ? "✓ Configured" : "✗ Not configured"}`);
  console.log(`[SMTP TEST] Pass: ${config.auth.pass ? "✓ Set" : "✗ Missing"}`);
  console.log(`[SMTP TEST] From: ${config.from}`);

  try {
    const verification = await verifySMTP();
    console.log(`[SMTP TEST] Verification result: ${verification.message}`);

    if (!verification.success) {
      return {
        success: false,
        message: `Verification failed: ${verification.message}`
      };
    }

    // Try sending a test email to yourself
    console.log(`[SMTP TEST] Attempting to send test email...`);
    const testResult = await sendEmail(
      config.auth.user,
      config.fromName || "Test",
      "Test SMTP Connection - AgencyGetJobs",
      `<h2>Test SMTP Successful</h2><p>This is a test email from AgencyGetJobs Arabic Scraper.</p>`,
      `Test SMTP Successful - This is a test email from AgencyGetJobs Arabic Scraper.`
    );

    if (testResult.success) {
      console.log(`[SMTP TEST] ✓ Test email sent successfully! Message ID: ${testResult.messageId}`);
      return {
        success: true,
        message: "SMTP connection verified and test email sent successfully!",
        config
      };
    } else {
      console.log(`[SMTP TEST] ✗ Test email failed: ${testResult.error}`);
      return {
        success: false,
        message: `Test email failed: ${testResult.error}`
      };
    }

  } catch (error: any) {
    console.error(`[SMTP TEST] Error: ${error.message}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("smtp-test")) {
  testSMTPConnection()
    .then(result => {
      console.log("\n[SMTP TEST] Final Result:");
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Test failed:", err);
      process.exit(1);
    });
}