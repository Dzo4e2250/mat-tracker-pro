import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SMTP Configuration - BillionMail
const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'postfix-billionmail';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '25');
const SMTP_FROM = Deno.env.get('SMTP_FROM') || 'noreply@reitti.cloud';

interface TestMat {
  qrCode: string;
  companyName: string | null;
  companyAddress: string | null;
  matTypeName: string;
  daysOnTest: number;
}

// Simple SMTP send using raw TCP
async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });

  const read = async (): Promise<string> => {
    const buf = new Uint8Array(1024);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  };

  const write = async (msg: string): Promise<void> => {
    await conn.write(encoder.encode(msg + '\r\n'));
  };

  try {
    // Read greeting
    await read();

    // EHLO
    await write(`EHLO localhost`);
    await read();

    // MAIL FROM
    await write(`MAIL FROM:<${SMTP_FROM}>`);
    await read();

    // RCPT TO
    await write(`RCPT TO:<${to}>`);
    await read();

    // DATA
    await write('DATA');
    await read();

    // Email content
    const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@reitti.cloud>`;
    const emailContent = [
      `From: Mat Tracker Pro <${SMTP_FROM}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      btoa(unescape(encodeURIComponent(htmlBody))),
      ``,
      `--${boundary}--`,
      `.`
    ].join('\r\n');

    await write(emailContent);
    await read();

    // QUIT
    await write('QUIT');
    await read();
  } finally {
    conn.close();
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.email);

    const { sellerEmail, sellerName, mats } = await req.json() as {
      sellerEmail: string;
      sellerName: string;
      mats: TestMat[];
    };

    if (!sellerEmail || !mats || mats.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group mats by company
    const matsByCompany = mats.reduce((acc, mat) => {
      const key = mat.companyName || 'Neznana stranka';
      if (!acc[key]) {
        acc[key] = {
          address: mat.companyAddress || 'Naslov ni znan',
          items: [],
        };
      }
      acc[key].items.push(mat);
      return acc;
    }, {} as Record<string, { address: string; items: TestMat[] }>);

    // Build items list HTML
    const itemsHtml = Object.entries(matsByCompany).map(([company, data]) => `
      <div style="margin: 20px 0; padding: 15px; background: #fff8f0; border-left: 4px solid #f97316; border-radius: 4px;">
        <p style="margin: 0 0 5px 0;"><strong>Stranka:</strong> ${company}</p>
        <p style="margin: 0 0 5px 0; color: #666;"><strong>Lokacija:</strong> ${data.address}</p>
        <p style="margin: 0 0 10px 0; color: #dc2626;"><strong>Status:</strong> POSKUSNO OBDOBJE POTEKLO</p>
        <p style="margin: 0 0 5px 0;"><strong>Zadrzani artikli:</strong></p>
        <ul style="margin: 5px 0 0 0; padding-left: 20px;">
          ${data.items.map(item => `
            <li style="margin: 3px 0;">
              1x ${item.matTypeName}
              <span style="color: #666; font-size: 12px;">(${item.qrCode}, ${item.daysOnTest} dni)</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">
          OPOZORILO: Poteklo poskusno obdobje (Testni predprazniki)
        </h2>

        <p>Pozdravljen/a <strong>${sellerName}</strong>,</p>

        <p>Obvescamo te, da se je za spodaj navedene stranke izteklo poskusno obdobje za testiranje predpraznikov.</p>

        <p>Prosimo, da pri teh strankah <strong>nemudoma</strong> uredis status:</p>

        <ul style="margin: 15px 0;">
          <li><strong>Podpis najemne pogodbe</strong> (ce je stranka zadovoljna) ali</li>
          <li><strong>Vracilo predpraznikov v skladisce</strong> (ce se za najem niso odlocili).</li>
        </ul>

        <hr style="border: none; border-top: 2px solid #f97316; margin: 25px 0;">

        <h3 style="color: #333; margin-bottom: 15px;">Seznam odprtih testiranj s pretecenim rokom:</h3>

        ${itemsHtml}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 15px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Avtomatsko obvestilo sistema Mat Tracker Pro.<br>
          Lindstrom Group
        </p>
      </body>
      </html>
    `;

    // Send email
    const subject = 'OPOZORILO: Poteklo poskusno obdobje (Testni predprazniki)';

    try {
      await sendEmail(sellerEmail, subject, emailHtml);
      console.log('Email sent to:', sellerEmail, 'with', mats.length, 'items');

      return new Response(
        JSON.stringify({ message: 'Email sent successfully', count: mats.length }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (smtpError) {
      console.error('SMTP error:', smtpError);
      return new Response(JSON.stringify({ error: `SMTP error: ${smtpError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
