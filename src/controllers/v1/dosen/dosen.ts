import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const expired = 86400; // 24 Jam
    const token = jwt.sign({ data: dosen }, process.env.jwt_secret_key, {
      expiresIn: expired, // 24 Jam
    });

    delete dosen.password;

    const valuesDosen = {
      ...dosen,
      role: 'dosen',
    };

    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      status: 200,
      data: valuesDosen,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Login gagal.');
  }
};

// Daftar mahasiswa bimbingan (baik pembimbing1 atau pembimbing2)
export const getDaftarBimbingan = async (req: Request, res: Response) => {
  const dosenId = req.userId;

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
  const dosenId = req.userId; // diasumsikan sudah diambil dari token

  try {
    // Cari data skripsi mahasiswa dan pastikan dosen adalah pembimbingnya
    const skripsi = await prisma.skripsi.findFirst({
      where: {
        id_mahasiswa: mahasiswaId,
        OR: [{ id_pembimbing1: dosenId }, { id_pembimbing2: dosenId }],
      },
    });

    if (!skripsi) {
      return res.status(403).json({ message: 'Anda bukan pembimbing mahasiswa ini' });
    }

    // Tentukan role secara otomatis
    let role: 'pembimbing1' | 'pembimbing2';
    if (skripsi.id_pembimbing1 === dosenId) {
      role = 'pembimbing1';
    } else if (skripsi.id_pembimbing2 === dosenId) {
      role = 'pembimbing2';
    } else {
      return res.status(403).json({ message: 'Role pembimbing tidak valid' });
    }

    // Simpan atau update approval
    const approval = await prisma.approvalSkripsi.upsert({
      where: {
        id_mahasiswa_id_dosen_role: {
          id_mahasiswa: mahasiswaId,
          id_dosen: dosenId,
          role,
        },
      },
      update: {
        status,
        catatan,
      },
      create: {
        id_mahasiswa: mahasiswaId,
        id_dosen: dosenId,
        status,
        catatan,
        role,
      },
    });

    res.status(200).json({ message: 'Approval berhasil disimpan', approval });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menyimpan approval' });
  }
};

// Lihat daftar sidang sebagai penguji
export const getDaftarSidang = async (req: Request, res: Response) => {
  const dosenId = req.userId as string;
  try {
    const sidang = await prisma.pendaftaranSidang.findMany({
      where: {
        OR: [{ id_penguji1: dosenId }, { id_penguji2: dosenId }],
      },
      include: {
        mahasiswa: true,
        skripsi: true,
      },
    });

    res.status(200).json({ data: sidang });
  } catch (error) {
    console.error(error);
    res.status(500).send('Gagal mengambil daftar sidang.');
  }
};

export const inputCatatanPenguji = async (req: Request, res: Response) => {
  const { pendaftaranId, catatan } = req.body;
  const dosenId = req.userId as string;

  try {
    const sidang = await prisma.pendaftaranSidang.findUnique({
      where: { id: pendaftaranId },
    });

    if (!sidang) {
      return res.status(404).json({ message: 'Data sidang tidak ditemukan.' });
    }

    let dataUpdate: any = {};

    if (sidang.id_penguji1 === dosenId) {
      dataUpdate.catatan_penguji1 = catatan;
    } else if (sidang.id_penguji2 === dosenId) {
      dataUpdate.catatan_penguji2 = catatan;
    } else {
      return res.status(403).json({ message: 'Anda bukan penguji sidang ini.' });
    }

    const update = await prisma.pendaftaranSidang.update({
      where: { id: pendaftaranId },
      data: dataUpdate,
    });

    res.status(200).json({ message: 'Catatan penguji berhasil disimpan.', data: update });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Terjadi Kesalahan',
      error,
    });
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

    // Cek apakah NIDN atau email sudah digunakan di tabel dosen
    const existingDosen = await prisma.dosen.findFirst({
      where: {
        OR: [
          { nidn },
          { email },
        ],
      },
    });

    // Cek email di tabel admin
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    // Cek email di tabel mahasiswa
    const existingMahasiswa = await prisma.mahasiswa.findUnique({
      where: { email },
    });

    if (existingDosen) {
      return res.status(400).json({
        message:
          existingDosen.nidn === nidn
            ? 'NIDN sudah terdaftar oleh dosen lain'
            : 'Email sudah terdaftar oleh dosen lain',
      });
    }

    if (existingAdmin) {
      return res.status(400).json({
        message: 'Email sudah terdaftar oleh admin',
      });
    }

    if (existingMahasiswa) {
      return res.status(400).json({
        message: 'Email sudah terdaftar oleh mahasiswa',
      });
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDosen = await prisma.dosen.create({
      data: {
        nidn,
        nama,
        email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({
      message: 'Dosen berhasil ditambahkan',
      data: newDosen,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal menambahkan dosen' });
  }
};



export const getAllDosen = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;
    const showDeleted = req.query.showDeleted === 'true';

    const whereClause: Prisma.DosenWhereInput = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (search) {
      whereClause.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nidn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [dosenList, total] = await Promise.all([
      prisma.dosen.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { nama: 'asc' },
        select: {
          id: true,
          nama: true,
          nidn: true,
          email: true,
          deletedAt: true,
          password: true, // ambil password untuk disetel ke "" nanti
        },
      }),
      prisma.dosen.count({ where: whereClause }),
    ]);

    // Kosongkan password di response
    const sanitizedData = dosenList.map((dosen) => ({
      ...dosen,
      password: "",
    }));

    return res.status(200).json({
      message: 'Daftar dosen berhasil diambil',
      data: sanitizedData,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil daftar dosen' });
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
    const { nidn, nama, email, password, restore } = req.body;

    // Cek jika email atau nidn sudah digunakan oleh dosen lain
    const existingDosen = await prisma.dosen.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { nidn },
              { email },
            ],
          },
        ],
      },
    });

    // Cek ke tabel admin
    const existingAdmin = await prisma.admin.findFirst({
      where: {
        email,
      },
    });

    // Cek ke tabel mahasiswa
    const existingMahasiswa = await prisma.mahasiswa.findFirst({
      where: {
        email,
      },
    });

    if (existingDosen) {
      return res.status(400).json({
        message:
          existingDosen.nidn === nidn
            ? 'NIDN sudah digunakan oleh dosen lain'
            : 'Email sudah digunakan oleh dosen lain',
      });
    }

    if (existingAdmin) {
      return res.status(400).json({
        message: 'Email sudah digunakan oleh admin',
      });
    }

    if (existingMahasiswa) {
      return res.status(400).json({
        message: 'Email sudah digunakan oleh mahasiswa',
      });
    }

    const dataToUpdate: any = {
      nidn,
      nama,
      email,
    };

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      dataToUpdate.password = hashedPassword;
    }

    if (restore === true) {
      dataToUpdate.deletedAt = null;
    }

    const updated = await prisma.dosen.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.status(200).json({ message: 'Dosen berhasil diupdate', data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengupdate dosen' });
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
