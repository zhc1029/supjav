import { NextResponse, type NextRequest } from "next/server";
import { getVideoDetail } from "@/lib/scraper";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  try {
    const { id, slug } = await params;
    const result = await getVideoDetail(id, slug);
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
