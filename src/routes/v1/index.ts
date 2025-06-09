import { Router } from 'express';
import adminRoutes from './routes/admin';
import mahasiswaRoutes from './routes/mahasiswa';
import dosenRoutes from './routes/dosen';
import auth from './routes/auth';

const router: Router = Router();

router.use('/auth', auth);
router.use('/', adminRoutes);
router.use('/', mahasiswaRoutes);
router.use('/dosen', dosenRoutes);

export default router;
