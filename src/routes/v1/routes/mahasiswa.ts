import { Router } from 'express';
import * as MahasiswaController from '@controller/v1/mahasiswa/mahasiswa';
const router: Router = Router();

// Route untuk login mahasiswa
router.post('/login-mhs', MahasiswaController.login);

// Route untuk melihat status kelayakan mahasiswa (sidang)
router.get('/status', MahasiswaController.getStatus);

// Route untuk mengunggah bukti pembayaran sidang
router.post('/upload-pembayaran-sidang', MahasiswaController.uploadBuktiPembayaran);

// Route untuk melihat hasil sidang mahasiswa
router.get('/hasil-sidang', MahasiswaController.getHasilSidang);

// Route untuk melihat pembimbing yang ditunjuk
router.get('/pembimbing', MahasiswaController.getPembimbing);

export default router;
