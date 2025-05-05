import { Router } from 'express';
import adminRoutes from './routes/admin';
// import authRoutes from './routes/auth.route';
// import mahasiswaRoutes from './routes/mahasiswa.route';
// import dosenRoutes from './routes/dosen.route';

const router: Router = Router();

router.use('/', adminRoutes);
// router.use('/auth', authRoutes);
// router.use('/mahasiswa', mahasiswaRoutes);
// router.use('/dosen', dosenRoutes);

export default router;
