import redis from "../utils/redisClient.js";
import supabase from "../utils/supabaseClient.js";
import { transporter } from "../utils/nodemailerClient.js";

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOTP();

        await redis.setex(`otp:${email}`, 600, otp);

        await transporter.sendMail({
            from: `Eazy Docs Support <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Here's your OTP Code",
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
            html: `<p>Your OTP is <b>${otp}</b>. It will expire in <b>10 minutes</b>.</p>`,
        });

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ success: false, message: "Error sending OTP" });
    }
}

export const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    const storedOtp = await redis.get(`otp:${email}`);

    if (!storedOtp) {
        return res.status(400).json({ success: false, message: "OTP expired or not found" });
    }

    if (storedOtp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await supabase.from("users").update({ verified: true }).eq("email", email);

    await redis.del(`otp:${email}`); // remove OTP after success
    res.json({ success: true, message: "Email verified successfully" });
}
