import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

export const sendEmail = async (
  userEmail: string,
  subject: string,
  message: string
) => {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const mailOptions = {
      from: {
        name: "Brand Visibility Tracker",
        email: process.env.SMTP_FROM_EMAIL as string,
      },
      to: userEmail,
      subject,
      html: message,
    };

    await sgMail.send(mailOptions);
  } catch (error) {
    return new NextResponse("Error in sending email " + error, { status: 500 });
  }
};
