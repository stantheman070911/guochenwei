// Initializes and exports the Resend client singleton using RESEND_API_KEY from env

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error(
    "Missing environment variable: RESEND_API_KEY must be set before starting the server."
  );
}

export const resend = new Resend(apiKey);
