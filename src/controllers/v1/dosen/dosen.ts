import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Login dosen
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email dan password wajib diisi.');
  }

  try {
    const dosen = await prisma.dosen.findUnique({ where: { email } });

    if (!dosen) return res.status(404).send('Dosen tidak ditemukan.');

    const valid = await bcrypt.compare(password, dosen.password);
    if (!valid) return res.status(401).send('Password salah.');

    res.status(200).json({ message: 'Login berhasil!', dosenId: dosen.id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Login gagal.');
  }
};

// Daftar mahasiswa bimbingan (baik pembimbing1 atau pembimbing2)
export const getDaftarBimbingan = async (req: Request, res: Response) => {
  const { dosenId } = req.query;

  try {
    const bimbingan = await prisma.skripsi.findMany({
      where: {
        OR: [{ id_pembimbing1: dosenId as string }, { id_pembimbing2: dosenId as string }],
      },
      include: {
        mahasiswa: true,
      },
    });

    res.status(200).json(bimbingan);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil daftar bimbingan.');
  }
};

// ACC atau tolak skripsi
export const approveSkripsi = async (req: Request, res: Response) => {
  const { mahasiswaId, status, catatan } = req.body;

  try {
    const update = await prisma.mahasiswa.update({
      where: { id: mahasiswaId },
      data: {
        isEligibleForSidang: status === 'ACC',
        catatanSkripsi: catatan,
      },
    });

    res.status(200).json(update);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal memperbarui status skripsi.');
  }
};

// Lihat daftar sidang sebagai penguji
export const getDaftarSidang = async (req: Request, res: Response) => {
  const { dosenId } = req.query;

  try {
    const sidang = await prisma.pendaftaranSidang.findMany({
      where: { id_penguji: dosenId as string },
      include: {
        mahasiswa: true,
        skripsi: true,
        jadwal: true,
      },
    });

    res.status(200).json(sidang);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil daftar sidang.');
  }
};

// Input hasil sidang mahasiswa
export const inputHasilSidang = async (req: Request, res: Response) => {
  const { pendaftaranId, status, catatan } = req.body;

  try {
    const update = await prisma.pendaftaranSidang.update({
      where: { id: pendaftaranId },
      data: {
        status,
        catatan,
      },
    });

    res.status(200).json(update);
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal menyimpan hasil sidang.');
  }
};

// Lihat berita dari admin
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

export const getDetailBimbingan = async (req: Request, res: Response) => {
  const { mahasiswaId } = req.params;

  try {
    const skripsi = await prisma.skripsi.findUnique({
      where: {
        id_mahasiswa: mahasiswaId,
      },
      include: {
        mahasiswa: {
          select: {
            nama: true,
            nim: true,
            email: true,
          },
        },
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
    });

    if (!skripsi) {
      return res.status(404).send('Data skripsi mahasiswa tidak ditemukan.');
    }

    res.status(200).json({
      mahasiswa: skripsi.mahasiswa,
      judul: skripsi.judul,
      status: skripsi.status,
      catatanPembayaran: skripsi.catatanPembayaran,
      pembimbing1: skripsi.pembimbing1,
      pembimbing2: skripsi.pembimbing2,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan saat mengambil detail skripsi.');
  }
};

// CREATE
export const createDosen = async (req: Request, res: Response) => {
  try {
    const { nidn, nama, email, password } = req.body;

    // Hash password before storing
    const hashedPassword = password; // Jika Anda menggunakan bcryptjs atau password hashing lainnya, hash di sini

    const newDosen = await prisma.dosen.create({
      data: {
        nidn,
        nama,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: 'Dosen berhasil ditambahkan', data: newDosen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan dosen' });
  }
};

// READ (LIST)
export const getAllDosen = async (req: Request, res: Response) => {
  try {
    const dosenList = await prisma.dosen.findMany({
      where: { deletedAt: null },
    });

    res.status(200).json({ message: 'Daftar dosen berhasil diambil', data: dosenList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil daftar dosen' });
  }
};

// READ (BY ID)
export const getDosenById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const dosen = await prisma.dosen.findUnique({
      where: { id },
    });

    if (!dosen) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan' });
    }

    res.status(200).json({ data: dosen });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil dosen' });
  }
};

// UPDATE
export const updateDosen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nidn, nama, email, password } = req.body;

    // Hash password before updating (if updated)
    const hashedPassword = password ? password : undefined;

    const updated = await prisma.dosen.update({
      where: { id },
      data: {
        nidn,
        nama,
        email,
        password: hashedPassword ? hashedPassword : undefined,
      },
    });

    res.status(200).json({ message: 'Dosen berhasil diupdate', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate dosen' });
  }
};

// DELETE (Soft delete)
export const deleteDosen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.dosen.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({ message: 'Dosen berhasil dihapus (soft delete)' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus dosen' });
  }
};
