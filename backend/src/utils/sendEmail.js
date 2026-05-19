import nodemailer from "nodemailer";

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

  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "OTP Verification",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
};
