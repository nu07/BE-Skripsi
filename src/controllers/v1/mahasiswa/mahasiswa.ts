import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  console.log(email);
  console.log(password);
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

    res.status(200).send('Login berhasil!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const getStatus = async (req: Request, res: Response) => {
  const { mahasiswaId } = req.params;

  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id: mahasiswaId },
      select: {
        isEligibleForSkripsi: true,
        isEligibleForSidang: true,
        catatanSkripsi: true,
      },
    });

    if (!mahasiswa) {
      return res.status(404).send('Mahasiswa tidak ditemukan.');
    }

    res.status(200).json({
      isEligibleForSkripsi: mahasiswa.isEligibleForSkripsi,
      isEligibleForSidang: mahasiswa.isEligibleForSidang,
      catatanSkripsi: mahasiswa.catatanSkripsi,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const uploadBuktiPembayaran = async (req: Request, res: Response) => {
  const { mahasiswaId } = req.params;
  const file = req.files?.buktiPembayaran; // Middleware untuk file upload

  if (!file) {
    return res.status(400).send('Bukti pembayaran tidak ditemukan.');
  }

  try {
    const filePath = `/uploads/${new Date()}`;

    await prisma.skripsi.update({
      where: { id_mahasiswa: mahasiswaId },
      data: { buktiPembayaran: filePath },
    });

    res.status(200).send('Bukti pembayaran berhasil diunggah.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

export const getHasilSidang = async (req: Request, res: Response) => {
  const { mahasiswaId } = req.params;

  try {
    // Gunakan findMany jika ada kemungkinan lebih dari satu pendaftaran sidang per mahasiswa
    const hasilSidang = await prisma.pendaftaranSidang.findMany({
      where: {
        id_mahasiswa: mahasiswaId, // Filter berdasarkan id_mahasiswa
      },
      select: {
        status: true,
        catatan: true,
        tanggal_sidang: true,
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
  const { mahasiswaId } = req.params;

  try {
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id: mahasiswaId },
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
