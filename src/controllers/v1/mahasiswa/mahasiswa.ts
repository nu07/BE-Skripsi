import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email dan password harus diisi.');
  }

  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { email },
    });

    if (!mahasiswa) {
      return res.status(404).send('Mahasiswa tidak ditemukan.');
    }

    const isPasswordValid = await bcrypt.compare(password, mahasiswa.password);
    if (!isPasswordValid) {
      return res.status(401).send('Password salah.');
    }
    const expired = 86400; // 24 Jam
    const token = jwt.sign({ data: mahasiswa }, process.env.jwt_secret_key, {
      expiresIn: expired, // 24 Jam
    });
    delete mahasiswa.password;

    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      status: 200,
      data: mahasiswa,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const getStatus = async (req: Request, res: Response) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id: req.userId },
      select: {
        isEligibleForSkripsi: true,
        isEligibleForSidang: true,
        catatanSkripsi: true,
      },
    });

    if (!mahasiswa) {
      return res.status(404).send('Mahasiswa tidak ditemukan.');
    }
    const data = {
      isEligibleForSkripsi: mahasiswa.isEligibleForSkripsi,
      isEligibleForSidang: mahasiswa.isEligibleForSidang,
      catatanSkripsi: mahasiswa.catatanSkripsi,
    };
    if (mahasiswa.isEligibleForSkripsi) {
      res.status(200).json({
        message: 'Selamat Anda Di Nyatakan Layar Mengikuti Skripsi',
        data: data,
        status: 200,
      });
    } else {
      res.status(200).json({
        message: 'Mohon Maaf Anda Belum Berhak Mengikut Skripsi',
        data,
        status: 200,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'error',
      error,
    });
  }
};

export const uploadBuktiPembayaran = async (req: Request, res: Response) => {
  const file = req.file?.buktiPembayaran; // Middleware untuk file upload

  if (!file) {
    return res.status(400).send('Bukti pembayaran tidak ditemukan.');
  }

  try {
    const filePath = `/uploads/${new Date()}`;

    await prisma.skripsi.update({
      where: { id_mahasiswa: req.userId },
      data: { buktiPembayaran: filePath },
    });

    res.status(200).send('Bukti pembayaran berhasil diunggah.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const getHasilSidang = async (req: Request, res: Response) => {
  try {
    // Gunakan findMany jika ada kemungkinan lebih dari satu pendaftaran sidang per mahasiswa
    const hasilSidang = await prisma.pendaftaranSidang.findMany({
      where: {
        id_mahasiswa: req.userId, // Filter berdasarkan id_mahasiswa
      },
      include: {
        penguji1: true,
        penguji2: true,
      },
    });

    if (!hasilSidang || hasilSidang.length === 0) {
      return res.status(404).send('Hasil sidang tidak ditemukan.');
    }

    res.status(200).json(hasilSidang);
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const getPembimbing = async (req: Request, res: Response) => {
  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id: req.userId },
      select: {
        skripsi: {
          select: {
            pembimbing1: {
              select: {
                nama: true,
                email: true,
              },
            },
            pembimbing2: {
              select: {
                nama: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!mahasiswa || !mahasiswa.skripsi) {
      return res.status(404).send('Pembimbing tidak ditemukan.');
    }

    res.status(200).json({
      pembimbing1: mahasiswa.skripsi.pembimbing1,
      pembimbing2: mahasiswa.skripsi.pembimbing2,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

// Upload bukti pembayaran skripsi
export const uploadBuktiPembayaranSkripsi = async (req: Request, res: Response) => {
  const { judul } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send('Bukti pembayaran tidak ditemukan.');
  }
  // bisa nambahin id_pembimbing1 dan 2 kedepanya.
  const filePath = file.path;

  try {
    // Cek apakah skripsi sudah ada
    const existingSkripsi = await prisma.skripsi.findUnique({
      where: { id_mahasiswa: req.userId },
    });

    if (existingSkripsi) {
      // Update bukti pembayaran
      removeImage(existingSkripsi.buktiPembayaran);
      await prisma.skripsi.update({
        where: { id_mahasiswa: req.userId },
        data: { buktiPembayaran: filePath, status: 'Menunggu' },
      });
    } else {
      await prisma.skripsi.create({
        data: {
          id_mahasiswa: req.userId,
          judul: judul,
          // Jangan sertakan pembimbing jika memang belum ditentukan
          buktiPembayaran: filePath,
          status: 'Menunggu',
        },
      });
    }

    res.status(200).send('Bukti pembayaran skripsi berhasil diunggah.');
  } catch (error) {
    console.error(error);
    removeImage(filePath);
    res.status(500).json({
      message: 'Gagal mengunggah bukti pembayaran.',
      err: error,
    });
  }
};

// Lihat data skripsi mahasiswa
export const getSkripsi = async (req: Request, res: Response) => {
  try {
    const skripsi = await prisma.skripsi.findUnique({
      where: { id_mahasiswa: req.userId as string },
      select: {
        judul: true,
        status: true,
        catatanPembayaran: true,
        buktiPembayaran: true,
      },
    });

    if (!skripsi) return res.status(404).send('Data skripsi tidak ditemukan.');

    return res.status(200).json(skripsi);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan saat mengambil data skripsi.');
  }
};

// Daftar sidang (insert PendaftaranSidang)
export const daftarSidang = async (req: Request, res: Response) => {
  const mahasiswaId = req.userId;

  try {
    // Ambil skripsi mahasiswa berdasarkan ID user
    const skripsi = await prisma.skripsi.findFirst({
      where: {
        id_mahasiswa: mahasiswaId,
        deletedAt: null,
      },
    });

    if (!skripsi) {
      return res.status(404).json({ message: 'Data skripsi tidak ditemukan.' });
    }

    // Cek apakah sudah pernah mendaftar sidang
    const existing = await prisma.pendaftaranSidang.findFirst({
      where: {
        id_mahasiswa: mahasiswaId,
        id_skripsi: skripsi.id,
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Anda sudah mendaftar sidang sebelumnya.' });
    }

    // Validasi apakah sudah disetujui oleh pembimbing 1 dan 2
    const approvals = await prisma.approvalSkripsi.findMany({
      where: {
        id_mahasiswa: mahasiswaId,
        status: true, // status harus berupa string "ACC" sesuai skema
      },
    });

    const rolesAcc = approvals.map((a) => a.role);
    const isApprovedByBoth = rolesAcc.includes('pembimbing1') && rolesAcc.includes('pembimbing2');

    if (!isApprovedByBoth) {
      return res.status(400).json({
        message: 'Skripsi belum disetujui oleh kedua pembimbing.',
      });
    }

    // Buat pendaftaran sidang
    const pendaftaran = await prisma.pendaftaranSidang.create({
      data: {
        id_mahasiswa: mahasiswaId,
        id_skripsi: skripsi.id,
        status: 'Menunggu',
      },
    });

    res.status(201).json(pendaftaran);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mendaftar sidang.');
  }
};

// Lihat approval history
export const getApprovalHistory = async (req: Request, res: Response) => {
  try {
    const pendaftaran = await prisma.pendaftaranSidang.findFirst({
      where: { id_mahasiswa: req.userId as string },
      include: {
        approvalHistories: {
          include: {
            admin: { select: { nama: true } },
          },
        },
      },
    });

    if (!pendaftaran) return res.status(404).send('Pendaftaran tidak ditemukan.');

    res.status(200).json(pendaftaran.approvalHistories);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil approval history.');
  }
};

// Lihat jadwal sidang
export const getJadwalSidang = async (req: Request, res: Response) => {
  try {
    const jadwal = await prisma.pendaftaranSidang.findFirst({
      where: { id_mahasiswa: req.userId as string },
      include: {
        penguji1: true,
        penguji2: true,
      },
    });

    res.status(200).json(jadwal);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil jadwal sidang.');
  }
};

// Lihat berita terbaru dari admin
export const getNews = async (_req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { nama: true } },
      },
    });

    res.status(200).json(news);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil berita.');
  }
};

const removeImage = (filePath) => {
  filePath = path.join(__dirname, '../../../../', filePath);
  fs.unlink(filePath, (err) => err);
};
