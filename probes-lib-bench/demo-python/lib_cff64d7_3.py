# Checker doi khang: pytest cho phe_duyet.duyet / phe_duyet.chia_ky
# Cac probe P1-P6 assert theo SPEC, khong theo hanh vi hien tai cua code.
import pytest

from phe_duyet import duyet, chia_ky


def test_P1_chuyen_vien_duyet_dung_bang_tran():
    assert duyet("chuyen_vien", 500_000_000) is True


def test_P2_truong_phong_duyet_dung_bang_tran():
    assert duyet("truong_phong", 2_000_000_000) is True


def test_P3_chuyen_vien_vuot_tran_dung_1_dong_phai_raise():
    with pytest.raises(ValueError) as exc_info:
        duyet("chuyen_vien", 500_000_001)
    assert str(exc_info.value) != ""


def test_P4_chuyen_vien_duoi_tran_1_dong_van_duyet_duoc():
    assert duyet("chuyen_vien", 499_999_999) is True


def test_P5_chia_ky_so_chia_khong_het_phan_du_ve_ky_cuoi():
    ky = chia_ky(100, 3)
    assert ky == [33, 33, 34]
    assert sum(ky) == 100


def test_P6_chia_ky_so_ky_ngoai_khoang_hop_le_raise():
    with pytest.raises(ValueError):
        chia_ky(600_000_000, 13)