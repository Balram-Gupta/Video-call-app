import nodemailer from "nodemailer";

const getMailErrorMessage = (error) => {
  if (error?.code === "EAUTH") {
    return "Gmail authentication failed. Use the Gmail address in EMAIL and a valid Gmail app password in EMAIL_PASS.";
  }

  if (error?.code === "ECONNECTION" || error?.code === "ETIMEDOUT") {
    return "Could not connect to Gmail SMTP. Check your internet connection or hosting provider SMTP restrictions.";
  }

  return error?.message || "Failed to send OTP email.";
};

export const sendEmail = async (email, otp) => {
  const emailUser = process.env.EMAIL?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim();

  if (!emailUser || !emailPass) {
    throw new Error("Email credentials are missing. Set EMAIL and EMAIL_PASS in backend/.env or your hosting environment.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass, // Gmail app password
    },
  });

  try {
    await transporter.sendMail({
      from: `"Video Call App" <${emailUser}>`,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
    });
  } catch (error) {
    throw new Error(getMailErrorMessage(error));
  }
};
