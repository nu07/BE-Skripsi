import { Router } from 'express';
import adminRoutes from './routes/admin';
import mahasiswaRoutes from './routes/mahasiswa';
import dosenRoutes from './routes/dosen';

const router: Router = Router();

router.use('/', adminRoutes);
router.use('/', mahasiswaRoutes);
router.use('/', dosenRoutes);

export default router;
