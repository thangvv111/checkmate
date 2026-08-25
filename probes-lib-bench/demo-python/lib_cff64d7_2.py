import pytest
from phe_duyet import duyet, chia_ky


def test_P1_chuyen_vien_duyet_dung_bang_tran():
    assert duyet("chuyen_vien", 500_000_000) is True


def test_P2_truong_phong_duyet_dung_bang_tran():
    assert duyet("truong_phong", 2_000_000_000) is True


def test_P3_chuyen_vien_ngay_duoi_tran():
    assert duyet("chuyen_vien", 499_999_999) is True


def test_P4_chuyen_vien_vuot_tran_1_dong():
    with pytest.raises(ValueError) as exc_info:
        duyet("chuyen_vien", 500_000_001)
    message = str(exc_info.value).lower()
    assert "chuyen_vien" in message or "hạn mức" in message or "han muc" in message


def test_P5_chia_ky_chia_khong_het_du_don_ky_cuoi():
    ky = chia_ky(700_000_000, 3)
    assert ky == [233_333_333, 233_333_333, 233_333_334]
    assert sum(ky) == 700_000_000


def test_P6_chia_ky_so_ky_ngoai_khoang_hop_le():
    with pytest.raises(ValueError):
        chia_ky(600_000_000, 13)