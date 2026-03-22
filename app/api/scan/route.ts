import { NextRequest, NextResponse } from "next/server";

type VirusTotalPostResponse = {
  data?: {
    id?: string;
  };
};

type VirusTotalResultResponse = {
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      stats?: {
        harmless?: number;
        malicious?: number;
        suspicious?: number;
        undetected?: number;
      };
    };
  };
};

const API_BASE = "https://www.virustotal.com/api/v3";
const POLL_ATTEMPTS = 6;
const POLL_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAnalysisById(id: string, apiKey: string) {
  const urlResult = await fetch(`${API_BASE}/urls/${id}`, {
    method: "GET",
    headers: {
      "x-apikey": apiKey,
    },
    cache: "no-store",
  });

  if (urlResult.ok) {
    return (await urlResult.json()) as VirusTotalResultResponse;
  }

  const analysisResult = await fetch(`${API_BASE}/analyses/${id}`, {
    method: "GET",
    headers: {
      "x-apikey": apiKey,
    },
    cache: "no-store",
  });

  if (!analysisResult.ok) {
    throw new Error("Failed to fetch scan result from VirusTotal.");
  }

  return (await analysisResult.json()) as VirusTotalResultResponse;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing VIRUSTOTAL_API_KEY in environment." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { url?: string };
    const submittedUrl = body.url?.trim();

    if (!submittedUrl) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const postResponse = await fetch(`${API_BASE}/urls`, {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: submittedUrl }).toString(),
      cache: "no-store",
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      return NextResponse.json(
        { error: `VirusTotal URL submit failed: ${errorText}` },
        { status: postResponse.status }
      );
    }

    const created = (await postResponse.json()) as VirusTotalPostResponse;
    const analysisId = created.data?.id;

    if (!analysisId) {
      return NextResponse.json(
        { error: "VirusTotal did not return analysis id." },
        { status: 502 }
      );
    }

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const scanResult = await fetchAnalysisById(analysisId, apiKey);
      const status = scanResult.data?.attributes?.status;

      if (status === "completed") {
        return NextResponse.json({
          status: "completed",
          analysisId,
          stats: scanResult.data?.attributes?.stats,
        });
      }

      if (attempt < POLL_ATTEMPTS - 1) {
        await sleep(POLL_DELAY_MS);
      }
    }

    return NextResponse.json({
      status: "pending",
      analysisId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while scanning URL.",
      },
      { status: 500 }
    );
  }
}
