import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extracts raw text from a .docx file using mammoth
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Fetch the file bytes
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Failed to fetch file' }, { status: 400 });

    const arrayBuffer = await fileRes.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Use mammoth via npm to extract text from docx
    const mammoth = await import('npm:mammoth@1.8.0');
    const result = await mammoth.extractRawText({ buffer: uint8Array });

    return Response.json({ text: result.value, messages: result.messages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});