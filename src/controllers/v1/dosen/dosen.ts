import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

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
  const status = req.query.status as string; // "progress" | "finish"
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || '';

  try {
    // Ambil semua skripsi yang dibimbing dosen
    const skripsiList = await prisma.skripsi.findMany({
      where: {
        OR: [{ id_pembimbing1: dosenId }, { id_pembimbing2: dosenId }],
        mahasiswa: {
          nama: {
            contains: search,
            mode: 'insensitive',
          },
        },
      },
      skip,
      take: limit,
      include: {
        mahasiswa: true,
        pembimbing1: true,
        pembimbing2: true,
      },
    });

    const mahasiswaIds = skripsiList.map((s) => s.id_mahasiswa);

    const approvals = await prisma.approvalSkripsi.findMany({
      where: {
        id_mahasiswa: { in: mahasiswaIds },
      },
    });

    const formatted = skripsiList.map((skripsi) => {
      const approval1 = approvals.find((a) => a.role === 'pembimbing1' && a.id_mahasiswa === skripsi.id_mahasiswa);
      const approval2 = approvals.find((a) => a.role === 'pembimbing2' && a.id_mahasiswa === skripsi.id_mahasiswa);

      return {
        ...skripsi,
        catatan_pembimbing1: approval1?.catatan ?? null,
        catatan_pembimbing2: approval2?.catatan ?? null,
        status_pembimbing1: approval1?.status ?? null,
        status_pembimbing2: approval2?.status ?? null,
      };
    });

    // Filter berdasarkan status approval dari dosen yang sedang login
    const filtered = formatted.filter((item) => {
      const statusPembimbing =
        item.id_pembimbing1 === dosenId
          ? item.status_pembimbing1
          : item.id_pembimbing2 === dosenId
            ? item.status_pembimbing2
            : null;

      if (status === 'progress') return statusPembimbing === false || statusPembimbing === null;
      if (status === 'finish') return statusPembimbing === true;
      return true; // tanpa filter
    });

    return res.status(200).json({
      message: 'Daftar mahasiswa berhasil diambil',
      data: filtered,
      pagination: {
        total: filtered.length,
        currentPage: page,
        totalPages: Math.ceil(filtered.length / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil daftar bimbingan.' });
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = req.query.status as string; // "coming" | "passed"
    const skip = (page - 1) * limit;
    const now = new Date();

    let whereClause: any = {
      OR: [{ id_penguji1: dosenId }, { id_penguji2: dosenId }],
      deletedAt: null,
    };

    // Filter nama mahasiswa jika ada
    if (search) {
      whereClause.mahasiswa = {
        nama: { contains: search, mode: 'insensitive' },
      };
    }

    // Filter berdasarkan waktu hanya jika status dikirim
    if (status === 'coming') {
      whereClause.tanggal_sidang = { gt: now };
    } else if (status === 'passed') {
      whereClause.tanggal_sidang = { lt: now };
    }

    const [sidangList, total] = await Promise.all([
      prisma.pendaftaranSidang.findMany({
        where: whereClause,
        include: {
          mahasiswa: true,
          skripsi: true,
          penguji1: true,
          penguji2: true,
        },
        skip,
        take: limit,
        orderBy: {
          tanggal_sidang: 'asc',
        },
      }),
      prisma.pendaftaranSidang.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      message: 'Daftar sidang berhasil diambil',
      data: sidangList,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil daftar sidang.' });
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

    if (
      (sidang.id_penguji1 === dosenId && sidang.catatan_penguji2) ||
      (sidang.id_penguji2 === dosenId && sidang.catatan_penguji1)
    ) {
      await prisma.pendaftaranSidang.update({
        where: { id: pendaftaranId },
        data: { status: 'finished' },
      });
    }

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
    const rawData = Array.isArray(req.body) ? req.body : [req.body];
    const isSingle = !Array.isArray(req.body);

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'Data dosen tidak boleh kosong.' });
    }

    const insertedDosen: any[] = [];
    const skippedDosen: any[] = [];

    for (const dosen of rawData) {
      const nidn = String(dosen.nidn); // pastikan string
      const { nama, email, password } = dosen;

      if (!nidn || !nama || !email || !password) {
        const failResponse = {
          nidn,
          email,
          status: 'failed',
          reason: 'Field wajib tidak boleh kosong',
        };
        if (isSingle) return res.status(400).json(failResponse);
        skippedDosen.push(failResponse);
        continue;
      }

      const [existingDosen, existingAdmin, existingMahasiswa] = await Promise.all([
        prisma.dosen.findFirst({ where: { OR: [{ nidn }, { email }] } }),
        prisma.admin.findUnique({ where: { email } }),
        prisma.mahasiswa.findUnique({ where: { email } }),
      ]);

      if (existingDosen || existingAdmin || existingMahasiswa) {
        const reason = existingDosen
          ? existingDosen.nidn === nidn
            ? 'NIDN sudah digunakan'
            : 'Email sudah digunakan oleh dosen'
          : existingAdmin
            ? 'Email sudah digunakan oleh admin'
            : 'Email sudah digunakan oleh mahasiswa';

        const failResponse = {
          nidn,
          email,
          status: 'failed',
          reason,
        };

        if (isSingle) return res.status(400).json(failResponse);
        skippedDosen.push(failResponse);
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newDosen = await prisma.dosen.create({
        data: {
          nidn,
          nama,
          email,
          password: hashedPassword,
        },
      });

      insertedDosen.push(newDosen);
    }

    // Respon jika input tunggal dan berhasil
    if (isSingle) {
      return res.status(201).json({
        ...insertedDosen[0],
        status: 'success',
      });
    }

    // Respon jika input banyak
    return res.status(201).json({
      message: `Berhasil menambahkan ${insertedDosen.length} dosen.`,
      inserted: insertedDosen,
      skipped: skippedDosen,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat menyimpan data dosen.',
      error: error instanceof Error ? error.message : error,
    });
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
      password: '',
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
            OR: [{ nidn }, { email }],
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

export const downloadLaporanBimbingan = async (req: Request, res: Response) => {
  const dosenId = req.userId;

  try {
    // Ambil semua skripsi yang dibimbing dosen
    const skripsiList = await prisma.skripsi.findMany({
      where: {
        OR: [{ id_pembimbing1: dosenId }, { id_pembimbing2: dosenId }],
      },
      include: {
        mahasiswa: {
          select: { nama: true, nim: true },
        },
      },
    });

    const mahasiswaIds = skripsiList.map((s) => s.id_mahasiswa);

    const approvals = await prisma.approvalSkripsi.findMany({
      where: {
        id_mahasiswa: { in: mahasiswaIds },
        id_dosen: dosenId,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Bimbingan');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 15 },
      { header: 'Nama', key: 'nama', width: 25 },
      { header: 'Judul Skripsi', key: 'judul', width: 40 },
      { header: 'Sebagai', key: 'role', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Catatan', key: 'catatan', width: 30 },
    ];

    skripsiList.forEach((skripsi, index) => {
      const approval = approvals.find((a) => a.id_mahasiswa === skripsi.id_mahasiswa);

      worksheet.addRow({
        no: index + 1,
        nim: skripsi.mahasiswa.nim,
        nama: skripsi.mahasiswa.nama,
        judul: skripsi.judul,
        role: skripsi.id_pembimbing1 === dosenId ? 'Pembimbing 1' : 'Pembimbing 2',
        status: approval?.status === true ? 'ACC' : approval?.status === false ? 'Tolak' : 'Belum',
        catatan: approval?.catatan ?? '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=bimbingan.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Gagal mengunduh laporan bimbingan.',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const downloadListSidangDiujiExcel = async (req: Request, res: Response) => {
  const dosenId = req.userId;

  try {
    const sidangList = await prisma.pendaftaranSidang.findMany({
      where: {
        OR: [{ id_penguji1: dosenId }, { id_penguji2: dosenId }],
      },
      include: {
        mahasiswa: {
          select: { nama: true, nim: true, email: true },
        },
        skripsi: {
          select: { judul: true },
        },
      },
      orderBy: {
        tanggal_sidang: 'asc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sidang yang Diuji');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIM', key: 'nim', width: 15 },
      { header: 'Nama', key: 'nama', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Judul Skripsi', key: 'judul', width: 40 },
      { header: 'Tanggal Sidang', key: 'tanggal', width: 20 },
      { header: 'Status Sidang', key: 'status', width: 15 },
      { header: 'Sebagai', key: 'sebagai', width: 15 },
      { header: 'Catatan', key: 'catatan', width: 30 },
    ];

    sidangList.forEach((item, index) => {
      const sebagai = item.id_penguji1 === dosenId ? 'Penguji 1' : 'Penguji 2';
      const catatan = item.id_penguji1 === dosenId ? item.catatan_penguji1 : item.catatan_penguji2;

      worksheet.addRow({
        no: index + 1,
        nim: item.mahasiswa?.nim || '-',
        nama: item.mahasiswa?.nama || '-',
        email: item.mahasiswa?.email || '-',
        judul: item.skripsi?.judul || '-',
        tanggal: item.tanggal_sidang ? new Date(item.tanggal_sidang).toLocaleDateString('id-ID') : '-',
        status: item.status || '-',
        sebagai,
        catatan: catatan ?? '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sidang-diuji.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Gagal mengunduh laporan sidang yang diuji.',
      error: error instanceof Error ? error.message : error,
    });
  }
};
