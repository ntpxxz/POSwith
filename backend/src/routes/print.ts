import { Router, Response } from 'express';
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import prisma from '../db/prisma.js';

const router = Router();

// ── helpers ─────────────────────────────────────────────────────────────────

async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map(r => [r.keyName, r.value ?? '']));
}

function buildPrinter(settings: Record<string, string>): ThermalPrinter {
  const type = settings['PRINTER_TYPE'] === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;
  const charsetKey = settings['PRINTER_CHAR_SET'] ?? 'WPC1252';
  const charset = (CharacterSet as Record<string, CharacterSet>)[charsetKey] ?? CharacterSet.WPC1252;

  return new ThermalPrinter({
    type,
    interface: settings['PRINTER_INTERFACE'] ?? 'tcp://192.168.1.100:9100',
    characterSet: charset,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: { timeout: 5000 },
  });
}

function centerPad(text: string, width = 42): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function leftRight(left: string, right: string, width = 42): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

// ── POST /receipt/:orderId ───────────────────────────────────────────────────

router.post('/receipt/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);

    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: { where: { status: 'SUCCESS' }, take: 1 },
          createdBy: { select: { name: true } },
        },
      }),
      getSettings(),
    ]);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const autoPrint = settings['AUTO_PRINT_RECEIPT'] === 'true';
    if (!autoPrint) {
      res.json({ success: false, autoPrint: false, message: 'Auto-print is disabled in settings' });
      return;
    }

    const printerEnabled = settings['PRINTER_ENABLED'] === 'true';
    if (!printerEnabled) {
      console.log(`[PRINT] Printer disabled — skipping receipt for order #${orderId}`);
      res.json({ success: true, autoPrint: true, message: 'Printer disabled — receipt not sent' });
      return;
    }

    const printer = buildPrinter(settings);
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.error(`[PRINT] Printer not reachable at ${settings['PRINTER_INTERFACE']}`);
      res.status(503).json({ error: 'Printer not reachable', interface: settings['PRINTER_INTERFACE'] });
      return;
    }

    const shopName   = settings['SHOP_NAME']    || 'POS System';
    const footer     = settings['RECEIPT_FOOTER'] || 'Thank you!';
    const taxPct     = parseFloat(settings['TAX_PERCENT'] || '0');
    const payment    = order.payments[0];
    const printedAt  = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // ── build receipt ──────────────────────────────────────────────
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println(shopName);
    printer.bold(false);
    printer.setTextNormal();
    printer.drawLine();

    printer.println(centerPad(printedAt));
    printer.println(centerPad(`เลขที่: ${order.orderNumber}`));
    if (order.createdBy?.name) {
      printer.println(centerPad(`พนักงาน: ${order.createdBy.name}`));
    }
    printer.drawLine();

    // items
    printer.alignLeft();
    for (const item of order.items) {
      const name  = item.nameSnapshot.substring(0, 24);
      const total = `${Number(item.total).toFixed(2)}`;
      printer.println(`${item.quantity}x ${name}`);
      printer.println(leftRight(`   @${Number(item.priceSnapshot).toFixed(2)}`, total));
    }
    printer.drawLine();

    // subtotal / discount / tax / total
    printer.println(leftRight('ยอดรวม', `${Number(order.totalAmount).toFixed(2)}`));
    if (Number(order.discountAmount) > 0) {
      printer.println(leftRight('ส่วนลด', `-${Number(order.discountAmount).toFixed(2)}`));
    }
    if (taxPct > 0) {
      const tax = Number(order.netAmount) * (taxPct / 100);
      printer.println(leftRight(`VAT ${taxPct}%`, tax.toFixed(2)));
    }

    printer.drawLine();
    printer.bold(true);
    printer.setTextDoubleHeight();
    printer.println(leftRight('รวมสุทธิ', `${Number(order.netAmount).toFixed(2)}`));
    printer.setTextNormal();
    printer.bold(false);

    if (payment) {
      printer.drawLine();
      printer.println(leftRight('ชำระด้วย', payment.method));
      if (payment.method === 'CASH') {
        const received = Number((payment as any).receivedAmount ?? order.netAmount);
        const change   = received - Number(order.netAmount);
        printer.println(leftRight('รับมา', received.toFixed(2)));
        printer.println(leftRight('เงินทอน', change.toFixed(2)));
      }
    }

    printer.drawLine();
    printer.alignCenter();
    printer.println(footer);
    printer.cut();

    await printer.execute();

    res.json({ success: true, autoPrint: true, message: 'Receipt printed' });
  } catch (err) {
    console.error('[PRINT] receipt error:', err);
    res.status(500).json({ error: 'Failed to communicate with printer hardware' });
  }
});

// ── POST /drawer ─────────────────────────────────────────────────────────────

router.post('/drawer', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getSettings();
    const printerEnabled = settings['PRINTER_ENABLED'] === 'true';

    if (!printerEnabled) {
      res.json({ success: false, message: 'Printer disabled — drawer not triggered' });
      return;
    }

    const printer = buildPrinter(settings);
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      res.status(503).json({ error: 'Printer not reachable', interface: settings['PRINTER_INTERFACE'] });
      return;
    }

    printer.openCashDrawer();
    await printer.execute();

    res.json({ success: true, message: 'Cash drawer opened' });
  } catch (err) {
    console.error('[PRINT] drawer error:', err);
    res.status(500).json({ error: 'Failed to open cash drawer' });
  }
});

// ── POST /test ────────────────────────────────────────────────────────────────

router.post('/test', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await getSettings();
    const printer = buildPrinter(settings);
    const isConnected = await printer.isPrinterConnected();

    if (!isConnected) {
      res.status(503).json({
        success: false,
        message: 'Printer not reachable',
        interface: settings['PRINTER_INTERFACE'],
      });
      return;
    }

    printer.alignCenter();
    printer.println('--- TEST PRINT ---');
    printer.println(settings['SHOP_NAME'] || 'POS System');
    printer.println(new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));
    printer.println('Printer OK');
    printer.cut();
    await printer.execute();

    res.json({ success: true, message: 'Test print sent', interface: settings['PRINTER_INTERFACE'] });
  } catch (err) {
    console.error('[PRINT] test error:', err);
    res.status(500).json({ error: 'Test print failed' });
  }
});

export default router;
