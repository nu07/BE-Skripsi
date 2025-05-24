import { Router } from 'express';
import * as DosenController from '@controller/v1/dosen/dosen';
import authJwt from '@middleware/authJWT';

const router: Router = Router();

// Login dosen
router.post('/login', DosenController.login);

// Lihat daftar mahasiswa bimbingan (pembimbing1 & pembimbing2)
router.get('/bimbingan', [authJwt.verifyToken], DosenController.getDaftarBimbingan);

// ACC atau tolak skripsi mahasiswa bimbingan
router.post('/approve-skripsi', [authJwt.verifyToken], DosenController.approveSkripsi);

// Lihat daftar sidang sebagai dosen penguji
router.get('/sidang', [authJwt.verifyToken], DosenController.getDaftarSidang);

// Input hasil/catatan sidang untuk mahasiswa yang diuji
router.put('/sidang/catatan', [authJwt.verifyToken], DosenController.inputCatatanPenguji);
// Lihat berita dari admin
router.get('/news', DosenController.getNews);
router.get('/bimbingan/:mahasiswaId', [authJwt.verifyToken], DosenController.getDetailBimbingan);

router.post('/dosen', [authJwt.verifyToken], DosenController.createDosen);
router.get('/dosen', [authJwt.verifyToken], DosenController.getAllDosen);
router.get('/dosen/:id', [authJwt.verifyToken], DosenController.getDosenById);
router.put('/dosen/:id', [authJwt.verifyToken], DosenController.updateDosen);
router.delete('/dosen/:id', [authJwt.verifyToken], DosenController.deleteDosen);

export default router;
