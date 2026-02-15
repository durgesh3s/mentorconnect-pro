import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'durgesh.singh.sde@gmail.com',
    pass: process.env.EMAIL_PASSWORD, // App password from Gmail
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using nodemailer
 * @param options Email options (to, subject, html)
 * @returns Promise<boolean> indicating success
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_PASSWORD) {
      console.warn('[Email Service] EMAIL_PASSWORD not set, skipping email');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'durgesh.singh.sde@gmail.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error);
    return false;
  }
}

/**
 * Send enrollment confirmation email to student
 */
export async function sendEnrollmentEmail(
  studentEmail: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<boolean> {
  const subject = `Welcome to ${courseTitle}!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${courseTitle}!</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          <p>Congratulations! You have successfully enrolled in <strong>${courseTitle}</strong>.</p>
          <p>You can now start learning at your own pace. Your learning journey begins now!</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/${courseId}/learn" class="button">Start Learning</a>
          <p>Best regards,<br>MentorConnect Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: studentEmail, subject, html });
}

/**
 * Send course completion email to student (ready for assessment)
 */
export async function sendCourseCompletionEmail(
  studentEmail: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<boolean> {
  const subject = `Congratulations! You've completed ${courseTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .alert { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Course Completed!</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName},</p>
          <p>Congratulations on completing <strong>${courseTitle}</strong>!</p>
          <p>You've successfully finished all the course materials. Great job!</p>
          <div class="alert">
            <strong>Ready for Assessment:</strong> You can now take the course assessment. The assessment window is open for 24 hours from now.
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/${courseId}/assessment" class="button">Take Assessment</a>
          <p>Best regards,<br>MentorConnect Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: studentEmail, subject, html });
}

/**
 * Send notification email to mentor/instructor when a student completes their course
 */
export async function sendMentorCompletionNotification(
  mentorEmail: string,
  mentorName: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<boolean> {
  const subject = `Student Completed: ${courseTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Student Course Completion</h1>
        </div>
        <div class="content">
          <p>Hi ${mentorName},</p>
          <p>A student has completed your course!</p>
          <div class="info-box">
            <p><strong>Student:</strong> ${studentName}</p>
            <p><strong>Course:</strong> ${courseTitle}</p>
            <p><strong>Status:</strong> Ready for Assessment</p>
          </div>
          <p>The student is now eligible to take the course assessment. They have 24 hours to complete it.</p>
          <p>Best regards,<br>MentorConnect Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: mentorEmail, subject, html });
}
