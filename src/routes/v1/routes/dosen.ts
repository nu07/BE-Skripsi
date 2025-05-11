import { Router } from 'express';
import * as DosenController from '@controller/v1/dosen/dosen';

const router: Router = Router();

// Login dosen
router.post('/login', DosenController.login);

// Lihat daftar mahasiswa bimbingan (pembimbing1 & pembimbing2)
router.get('/bimbingan', DosenController.getDaftarBimbingan);

// ACC atau tolak skripsi mahasiswa bimbingan
router.post('/approve-skripsi', DosenController.approveSkripsi);

// Lihat daftar sidang sebagai dosen penguji
router.get('/sidang', DosenController.getDaftarSidang);

// Input hasil/catatan sidang untuk mahasiswa yang diuji
router.post('/input-hasil-sidang', DosenController.inputHasilSidang);

// Lihat berita dari admin
router.get('/news', DosenController.getNews);
router.get('/bimbingan/:mahasiswaId', DosenController.getDetailBimbingan);

router.post('/dosen', DosenController.createDosen);
router.get('/dosen', DosenController.getAllDosen);
router.get('/dosen/:id', DosenController.getDosenById);
router.put('/dosen/:id', DosenController.updateDosen);
router.delete('/dosen/:id', DosenController.deleteDosen);

export default router;
