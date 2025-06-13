import { Router } from 'express';
import * as MahasiswaController from '@controller/v1/mahasiswa/mahasiswa';
import authJwt from '@middleware/authJWT';
import { uploadUser } from '@config/Multer';

const router: Router = Router();

// Route untuk login mahasiswa
router.post('/login-mhs', MahasiswaController.login);

// Route untuk melihat status kelayakan mahasiswa (sidang)
router.get('/status', [authJwt.verifyToken], MahasiswaController.getStatus);

// Route untuk mengunggah bukti pembayaran sidang
router.post('/upload-pembayaran-sidang', [authJwt.verifyToken], MahasiswaController.uploadBuktiPembayaran);

// Route untuk melihat hasil sidang mahasiswa
router.get('/hasil-sidang', [authJwt.verifyToken], MahasiswaController.getHasilSidang);

// Route untuk melihat pembimbing yang ditunjuk
router.get('/pembimbing', [authJwt.verifyToken], MahasiswaController.getPembimbing);

// Tambahan route mahasiswa
router.post(
  '/upload-pembayaran-skripsi',
  [authJwt.verifyToken, uploadUser.single('buktiPembayaran')],
  MahasiswaController.uploadBuktiPembayaranSkripsi,
);

router.get('/skripsi-me', [authJwt.verifyToken], MahasiswaController.getSkripsi);

router.post('/daftar-sidang', [authJwt.verifyToken], MahasiswaController.daftarSidang);

router.get('/approval-history', [authJwt.verifyToken], MahasiswaController.getApprovalHistory);

router.get('/jadwal-sidang', [authJwt.verifyToken], MahasiswaController.getJadwalSidang);

router.get('/news', [authJwt.verifyToken], MahasiswaController.getNews);

export default router;
