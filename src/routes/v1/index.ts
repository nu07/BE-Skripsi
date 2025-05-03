// routes/index.ts
import { Router } from 'express';
import mahasiswaRoutes from './routes/mahasiswa';
import dosenRoutes from './routes/dosen';
import adminRoutes from './routes/admin';
import skripsiRoutes from './routes/skripsi';
import pendaftaranSidangRoutes from './routes/pendaftaranSidang';
import authRoutes from './routes/auth';
import NewsRoute from './routes/news';

const router: Router = Router();

router.use('/auth', authRoutes);
router.use('/mahasiswa', mahasiswaRoutes);
router.use('/dosen', dosenRoutes);
router.use('/admin', adminRoutes);
router.use('/skripsi', skripsiRoutes);
router.use('/pendaftaran-sidang', pendaftaranSidangRoutes);
router.use('/news', NewsRoute);

export default router;
