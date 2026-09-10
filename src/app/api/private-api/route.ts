import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.PRIVATE_API_URL;
    const apiKey = process.env.PRIVATE_API_KEY;
    const apiKey2 = process.env.PRIVATE_API_KEY2;

    console.log("Environment check:", {
      hasApiUrl: Boolean(apiUrl),
      hasApiKey: Boolean(apiKey),
      hasApiKey2: Boolean(apiKey2),
    });

    if (!apiUrl) {
      return NextResponse.json(
        { message: "PRIVATE_API_URL is missing" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { message: "PRIVATE_API_KEY is missing" },
        { status: 500 }
      );
    }

    const requestBody = await request.json();

    const {
      to,
      fatherName,
      date,
      time,
    } = requestBody;
    
    if (!to) {
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }
    
    const messageBody = `Hello ${fatherName || "Parent"}, welcome to NIS! \nYour application has been submitted and your appointment is confirmed for ${date} at ${time}.\n Our Admissions Team will contact you if any further information is required. \nThank you for choosing Nermien Ismail Schools.`;  
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(apiKey2 ? { "x-project-id": apiKey2 } : {}),
      },
      body: JSON.stringify({
        to: `+2${to}`,
        message: messageBody,
      }),
    });

    const responseText = await response.text();

    let data: unknown;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error("Failed to parse private API response as JSON:", parseError);
      data = { message: responseText };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Private API error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}