import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Límite conservador: los cuerpos de función serverless en Vercel tienen un
// tope propio (unos 4.5 MB en el plan Hobby), así que nos quedamos por debajo.
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/--\s*\d+\s*of\s*\d+\s*--/g, "") // separadores de página que deja pdf-parse
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo enviado." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo pesa demasiado (máximo ${(
          MAX_FILE_BYTES /
          (1024 * 1024)
        ).toFixed(0)} MB). Prueba con un archivo más ligero, o copia y pega el texto directamente.`,
      },
      { status: 413 }
    );
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText = "";
  try {
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      rawText = result.text;
    } else if (name.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        {
          error:
            "Los archivos .doc (Word antiguo) no son compatibles. Abre el archivo en Word y guárdalo como .docx, o copia y pega el texto directamente.",
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Formato no compatible. Sube un archivo .docx, .pdf o .txt." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("extract-file error:", err);
    return NextResponse.json(
      {
        error:
          "No se pudo leer el contenido de este archivo. Puede estar dañado, protegido con contraseña, o ser un documento escaneado sin texto real. Intenta copiar y pegar el texto directamente.",
      },
      { status: 422 }
    );
  }

  const text = cleanExtractedText(rawText);

  if (!text) {
    return NextResponse.json(
      {
        error:
          "No se encontró texto en el archivo. Si es un documento escaneado (una imagen dentro de un PDF, por ejemplo), este sistema no puede leerlo — intenta copiar y pegar el texto directamente.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ text });
}
