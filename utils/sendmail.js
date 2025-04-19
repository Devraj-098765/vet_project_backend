import nodemailer from "nodemailer";

const sendEmail = async (to, subject, text, html = null) => {
  try {
    // Create a transporter using your email service (e.g., Gmail)
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Replace with your email service (e.g., SendGrid, Mailgun)
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html, // Optional HTML content
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export default sendEmail;