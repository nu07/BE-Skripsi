import { Router } from 'express';
import { signin, signup } from '@/controllers/auth';

const router: Router = Router();

router.post('/login', signin);
router.post('/register', signup); // opsional, tergantung siapa yang bisa register

export default router;
