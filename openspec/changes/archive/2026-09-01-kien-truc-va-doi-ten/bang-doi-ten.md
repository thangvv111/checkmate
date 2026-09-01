# Bảng ánh xạ đổi tên — lớp A

Suy từ **10 từ lõi PO chốt 01/09** + quy ước động từ. Đây là nguồn của pha áp dụng: review đọc bảng
này, không phải đọc diff 32 file.

## Từ lõi (PO chốt)

| Việt | Anh | Ghi chú |
|---|---|---|
| sổ (chỉ-ghi-thêm) | `ledger` | `log` gợi «xoá được» — sai bản chất pháp lý |
| cổng | `gate` | |
| kho | *(tách 4 nghĩa — xem dưới)* | một từ đang gánh 4 thứ |
| luật | `rule` | |
| khuôn lỗi | `pattern` → nay là `example` theo trigger | |
| vân tay lỗi | `fingerprint` | |
| lượt chấm | `run` | giữ nhất quán với `run_id`, bảng `run` |
| chấm (động từ) | `review` | không phải `grade` — cổng bác bỏ, không cho điểm |
| nhà cung cấp | `provider` | |
| trang / khối | `page` / `section` | |

**PO chốt thêm:** *sổ kiểm nhà cung cấp KHÔNG dùng `ledger`* — nó sửa được, gọi là ledger là nói sai
tính chất. Dùng `providerCheckRecord`.

## Động từ — quy ước, không cần chốt riêng

`doc`→`read` · `ghi`→`write`/`append` · `luu`→`save` · `nap`→`load` · `tim`→`find` · `dem`→`count`
· `loc`→`filter` · `sap`→`sort` · `tach`→`split` · `gop`→`merge` · `phat`→`emit` · `lay`→`get`
· `xay`→`build` · `don`→`cleanup` · `chuan`→`normalize` · `phan loai`→`classify` · `thu`→`try`
· `kiem`→`verify`/`check` · `che`→`mask` · `chieu`→`project` · `khoi`(UI)→`section`

## Hai từ gánh nhiều nghĩa — tách bạch khi đổi

**`kho` → 4 thứ khác nhau:**

| Cũ | Thực chất | Mới |
|---|---|---|
| `kho/` (thư mục) | tầng adapter chạm SQLite | `store/` |
| `kho-bi-mat.ts` | két token/khoá | `secret-vault.ts` |
| `KHO_KHUON` | danh mục ví dụ theo trigger | `TRIGGER_EXAMPLES` |
| `docKho`/`ghiKho` | két bí mật (đọc/ghi cả két) | `readVault`/`writeVault` |

**`so` → 3 sổ + 1 đồng âm:**

| Cũ | Là gì | Mới |
|---|---|---|
| `so_cai`/`soCai` | sổ cái verdict — chỉ-ghi-thêm | `verdictLedger` |
| `so_cong`/`SoCong` | sổ hành động cổng — chỉ-ghi-thêm | `gateLedger` |
| `docSoKiem`/`ghiSoKiem` | sổ kiểm nhà cung cấp — **SỬA ĐƯỢC** | `readProviderCheck`/`writeProviderCheck` |
| `soLieu`/`soDangChay` | **số** (number), đồng âm thuần tuý | `metrics`/`runningCount` |

## Ánh xạ export theo file

### `apps/web/src/config.ts`
`timRepo`→`findRepo` · `docConfig`→`readConfig` · `ghiConfig`→`writeConfig` ·
`cauHinhHienTai`→`currentConfig` · `cauHinhDeCham`→`configForReview` · `cheToken`→`maskToken` ·
`cheToken2`→`maskToken2` · `docTokenThueBao`→`readSubscriptionToken` ·
`ghiTokenThueBao`→`writeSubscriptionToken` · `diTruTokenRepo`→`migrateRepoToken` ·
`AgentConfig`→`AgentConfig` *(giữ)* · `TrucConfig`→`AxisConfig` · `LoiCauHinhNcc`→`ProviderConfigError`

### `apps/web/src/cong.ts` → nội dung cổng
`trungNguoi`→`samePerson` · `demMuc`→`countBySeverity` · `chuoiAnToan`→`safeString` ·
`chiTietNgoaiCong`→`outsideGateDetail` · `doiSoatCong`→`reconcileGate` · `ghiSo`→`appendGateLedger` ·
`banReceipt`→`renderReceipt` · `banVerdictTuDong`→`renderAutoVerdict` ·
`banPhanQuyet`→`renderRuling` · `TEN_TAC_NHAN_MAY`→`MACHINE_ACTOR_NAME`

### `apps/web/src/danh-tinh.ts` → `identity.ts`
`hopLeTen`→`validName` · `taoTaiKhoan`→`createAccount` · `doiMatKhau`→`changePassword` ·
`doiVai`→`changeRole` · `xoaTaiKhoan`→`deleteAccount` · `dsTaiKhoan`→`listAccounts` ·
`coTaiKhoanNao`→`hasAnyAccount` · `kiemMatKhau`→`verifyPassword` · `taoPhien`→`createSession` ·
`xoaPhien`→`deleteSession` · `donPhienHetHan`→`cleanupExpiredSessions` · `docCookie`→`readCookie` ·
`layDanhTinh`→`getIdentity` · `danhTinhNeuCo`→`identityIfAny` · `duocBamCong`→`canOperateGate` ·
`epBamCong`→`requireGateRole` · `duocVanHanh`→`canOperate` · `duocChayCham`→`canRunReview` ·
`duocSuaCauHinh`→`canEditConfig` · `Vai`→`Role` · `DanhTinh`→`Identity` ·
`LoiDanhTinh`→`IdentityError` · `TEN_COOKIE_PHIEN`→`SESSION_COOKIE_NAME` ·
`HAN_PHIEN_MS_HIEN_TAI`→`SESSION_TTL_MS`

### `apps/web/src/github.ts`
`layPrHienTai`→`getCurrentPr` · `trangThaiPr`→`prState` · `binhLuanPr`→`commentPr` ·
`traVeDev`→`returnToDev` · `ganTrangThaiCommit`→`setCommitStatus` · `dongPr`→`closePr` ·
`xoaCachePr`→`clearPrCache` · `danhSachPr`→`listPrs` · `cheTokenTrongVan`→`maskTokenInText` ·
`phanLoaiPr`→`classifyPr` · `danhSachRepoCuaToken`→`listReposForToken` ·
`tachOwnerRepo`→`splitOwnerRepo` · `kiemTraRepo`→`checkRepo` · `danhSachNhanh`→`listBranches` ·
`coDuongVaoGithub`→`hasGithubAccess` · `PrTomTat`→`PrSummary` · `PrHienTai`→`CurrentPr` ·
`KetQuaKiemRepo`→`RepoCheckResult`

### `apps/web/src/kho-bi-mat.ts` → `secret-vault.ts`
`docKho`→`readVault` · `ghiKho`→`writeVault` · `khoaRepo`→`repoKey` ·
`docTokenRepo`→`readRepoToken` · `docTokenRieng`→`readOwnToken` · `ghiTokenRepo`→`writeRepoToken` ·
`xoaTokenRepo`→`deleteRepoToken` · `coToken`→`hasToken` · `KhoSecret`→`SecretVault`

### `apps/web/src/kho/` → `apps/web/src/store/`
`db.ts`: `moDb`→`openDb` · `dongDb`→`closeDb` · `DUONG_DB`→`DB_PATH`
`di-tru.ts`→`migrate.ts`: `diTruTatCa`→`migrateAll` · `tomTatDiTru`→`migrationSummary` ·
`KetQuaDiTru`→`MigrationResult`
`kho-run.ts`→`run-store.ts`: `luuMeta`→`saveMeta` · `luuSuKien`→`saveEvents` · `docMeta`→`readMeta` ·
`docSuKien`→`readEvents` · `danhSachRun`→`listRuns` · `demRun`→`countRuns` · `timTheoPr`→`findByPr` ·
`dangChayPr`→`isPrRunning` · `soDangChay`→`runningCount` · `donLuotMoCoi`→`cleanupOrphanRuns` ·
`daTraVe`→`returnedToDev` · `LocRun`→`RunFilter`
`kho-socai.ts`→`ledger-store.ts`: `ghiSoCai`→`appendVerdictLedger` ·
`ghiSoCaiNeuChua`→`appendVerdictLedgerIfNew` · `docSoCai`→`readVerdictLedger` ·
`demSoCai`→`countVerdictLedger` · `coTrongSoCai`→`inVerdictLedger` · `ghiSoCong`→`appendGateLedger` ·
`prCanDoiSoat`→`prsNeedingReconcile` · `hanhDongCongCuaPr`→`gateActionsOfPr` ·
`docSoCong`→`readGateLedger` · `LocSoCai`→`VerdictLedgerFilter` · `LoiTrungRun`→`DuplicateRunError` ·
`MucSoCong`→`GateLedgerEntry`

### `apps/web/src/ledger.ts`
`mucTuMeta`→`entryFromMeta` · `backfillSoCai`→`backfillVerdictLedger` · `MucSoCai`→`VerdictLedgerEntry`

### `apps/web/src/ncc.ts` → `provider.ts`
`modelHopLe`→`validModel` · `dinhNghia`→`definition` · `docKhoa`→`readKey` · `ghiKhoa`→`writeKey` ·
`cheKhoa`→`maskKey` · `docSoKiem`→`readProviderCheck` · `ghiSoKiem`→`writeProviderCheck` ·
`chieuGiaTri`→`projectValue` · `kiemConHieuLuc`→`checkStillValid` · `MaNcc`→`ProviderId` ·
`PhuongThuc`→`Method` · `DS_PHUONG_THUC`→`METHODS` · `DinhNghiaNcc`→`ProviderDefinition` ·
`DANH_MUC_NCC`→`PROVIDER_CATALOG` · `CauHinhNcc`→`ProviderConfig` · `KetQuaKiem`→`CheckResult`

### `apps/web/src/nguon-model.ts` → `model-source.ts`
`docTrangThaiNcc`→`readProviderState` · `thuNcc`→`tryProvider` · `thuNguon`→`trySource` ·
`TrangThaiNcc`→`ProviderState` · `KetQuaThu`→`TryResult`

### `apps/web/src/tincay.ts` → `trust.ts`
`tinhHoSo`→`computeProfile` · `HoSoTacGia`→`AuthorProfile`

### UI — `trang`→`Page`, `khoi`→`Section`
`trangChu`→`homePage` · `trangSettings`→`settingsPage` · `trangRun`→`runPage` ·
`trangDocs`→`docsPage` · `trangLedger`→`ledgerPage` · `trangLichSu`→`historyPage` ·
`trangLogin`→`loginPage` · `trangTinCay`→`trustPage` · `trangHoSoTacGia`→`authorProfilePage` ·
`khoiNcc`→`providerSection` · `khoiRepo`→`repoSection` · `khoiPrList`→`prListSection` ·
`khoiDaTraVe`→`returnedToDevSection` · `khung`→`shell` · `oToken`→`tokenField` ·
`tachNguon`→`splitSource` · `locRuns`→`filterRuns` · `LocLichSu`→`HistoryFilter`
File: `ui-lich-su.ts`→`ui-history.ts` · `ui-ncc.ts`→`ui-provider.ts` · `ui-tincay.ts`→`ui-trust.ts`

### `packages/harness/src/`
`skill-code.ts`: `vanTayLoi`→`errorFingerprint` · `vanTayChat`→`tightFingerprint` ·
`nhanProbe`→`probeLabel` · `khopIdProbe`→`matchProbeId` · `coVeLaProbeHong`→`looksLikeBrokenProbe` ·
`laLuatMoi`→`isNewRule` · `phanLoaiMay`→`classifyByMachine` · `chaySkillCode`→`runCodeSkill` ·
`KeHoachProbe`→`ProbePlan` · `TrangThaiProbe`→`ProbeState`
`khuon-loi.ts`→`trigger-examples.ts`: `layKhuonCode`→`getCodeExamples` ·
`layKhuonDoc`→`getDocExamples` · `triThucTheoTrigger`→`knowledgeByTrigger` · `KhuonLoi`→`TriggerExample` ·
`TRAN_KHUON`→`EXAMPLE_CAP` · `VI_DU_MOI_TRIGGER`→`EXAMPLES_PER_TRIGGER` · `KHO_KHUON`→`TRIGGER_EXAMPLES` ·
`NhomTrigger`→`TriggerGroup`
`target.ts`: `trichMaLuat`→`extractRuleIds` · `timLuatMoi`→`findNewRules` · `dungDiff`→`buildDiff` ·
`docTarget`→`readTarget` · `goiYDuongDanModule`→`suggestModulePath` · `FileNgoaiTamNhin`→`FileOutOfView`
`runner.ts`: `docReviewCfg`→`readReviewCfg` · `docRunnerCfg`→`readRunnerCfg` ·
`mauBoQuaDiff`→`diffIgnorePatterns`
`model.ts`: `soLieuChiPhi`→`costMetrics` · `tomTatChiPhi`→`costSummary` · `envChoCli`→`envForCli` ·
`coVeLaTraLoiModel`→`looksLikeModelReply` · `matXacThuc`→`authLost` · `kiemTraProvider`→`checkProvider` ·
`chonProvider`→`pickProvider` · `doChiPhi`→`measureCost` · `MAU_MAT_XAC_THUC`→`AUTH_LOST_PATTERNS` ·
`LoiCauHinhCli`→`CliConfigError` · `LoiCauHinhProvider`→`ProviderConfigError`
`jsonx.ts`: `goiJson`→`callJson` · `bocJson`→`unwrapJson` · `bocCode`→`unwrapCode` ·
`goiCode`→`callCode` · `LoiModelDungTool`→`ModelUsedToolError`
`dedup-probe.ts`: `timTrungChayLai`→`findRerunDuplicate` · `timNghiTrung`→`findSuspectedDuplicate` ·
`promptPhanXuTrung`→`promptDuplicateRuling` · `apDungPhanXu`→`applyRuling` · `UngPhanXu`→`RulingCandidate` ·
`PhanXu`→`Ruling` · `QuyetDinhNap`→`AdmitDecision`
`rao.ts`→`fence.ts`: `taoRao`→`makeFence` · `Rao`→`Fence` · `LOI_RAO`→`FENCE_NOTICE`
`sandbox.ts`: `loiNapFile`→`fileLoadError` · `KetQuaProbe`→`ProbeResult` · `KetQuaVitest`→`VitestResult`
`skill-doc.ts`: `chaySkillDoc`→`runDocSkill` · `KetQuaSkillDoc`→`DocSkillResult`
`extract.ts`: `trichText`→`extractText` · `DINH_DANG_NHAN`→`SUPPORTED_FORMATS`

## KHÔNG đổi (lớp B/C)

Nhãn máy `hoi_quy·pass·cai_thien·vi_pham_luat_moi·ngoai_pham_vi·nghi_loi_co_san·nghi_van·bo_qua·khong_chay`
· trường verdict `ke_hoach·ghi_nhan·luat_da_phu·luat_tong·that_lac·chi_phi·token_vao·token_ra·uoc_tinh`
· trường finding `title_vi·what_vi·consequence_vi` · cột SQLite `tieu_de·trang_thai·bat_dau·ket_thuc·
cong_*·so_cai·so_cong` · trường `plan` của probe thư viện `id·ten·muc_dich·spec_rule·ky_vong` ·
khoá `checkmate.yml` `khuon_loi·bo_qua_diff·huong_dan_probe·severity_map·test_cmd·probe_dir·probe_ext·
timeout_s·framework·triggers` · khoá `config.json` `repos·repo_dang_chon·github_token·agent·truc` ·
`RunEvent` `type·stage·ten·msg` · `RunMeta`/`MucSoCai` **tên trường** đã vào cột.
