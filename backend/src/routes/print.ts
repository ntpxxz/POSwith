import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import db from '../db/schema.js';

const router = Router();

// POST /receipt/:orderId - Hardware print command integration
router.post('/receipt/:orderId', authenticate, (req: AuthRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const { hardware_type } = req.body;

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderId));
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        console.log(`\n🖨️  [HARDWARE INTEGRATION] ==========================`);
        console.log(`   Type: Thermal Receipt Printer 80mm`);
        console.log(`   Order ID: ${orderId}`);
        console.log(`   Sending ESC/POS bytes...`);
        console.log(`   [MOCK SUCESS] Ticket printed to default printer.`);
        console.log(`=====================================================\n`);

        // TODO: For production, implement node-thermal-printer or escpos library here
        // const device = new escpos.USB();
        // const printer = new escpos.Printer(device);

        res.json({ success: true, message: `Print command sent successfully to POS printer` });
    } catch (err) {
        console.error('Print command error:', err);
        res.status(500).json({ error: 'Failed to communicate with printer hardware' });
    }
});

// POST /drawer - Kick cash drawer
router.post('/drawer', authenticate, (req: AuthRequest, res: Response) => {
    console.log(`\n💰  [HARDWARE INTEGRATION] Sending pulse to kick cash drawer...\n`);
    res.json({ success: true, message: `Cash drawer opened` });
});

export default router;
