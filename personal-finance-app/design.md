# Đặc tả app Quản lý tài chính cá nhân

> Đặc tả vòng đầu. Viết từ buổi brainstorm ngày 19/10/2026, mọi phần đã được duyệt.
> Vòng 2 (21/10/2026): thêm `khoản dự chi` và màn ④ **Dự chi**.

**Chữ dùng trong app** (dùng thống nhất ở mọi chỗ):

| Chữ | Nghĩa |
|---|---|
| `ví` | Một chỗ giữ tiền: tài khoản ngân hàng, tiền mặt, thẻ tín dụng, vàng, chứng khoán |
| `khoản mục` | Nhóm chi tiêu (Ăn ngoài, Đi lại…) hoặc nguồn thu (Lương, Cổ tức…) |
| `khoản ghi` | Một dòng được ghi vào app: Chi, Thu, hoặc Chuyển giữa hai `ví` |
| `khoản cố định` | Khoản chi lặp lại hằng tháng, app tự ghi khi đến ngày (Spotify, Claude Pro, tiền dịch vụ nhà…) |
| `khoản dự chi` | Khoản chi **một lần** sắp tới mà mình đã biết trước (bảo hiểm xe, quà Tết, vé máy bay…). App **không tự ghi**, mình bấm "Đã chi" khi trả tiền |

---

## 1. Người dùng & vấn đề

**Ai dùng:** chỉ một người (chủ app), trên **máy tính** (ghi dồn cuối ngày hoặc cuối tuần) và **điện thoại**
(ghi ngay lúc trả tiền). Hai nơi dùng chung một dữ liệu.

**Vấn đề hiện tại:** đã thử Excel nhưng *"hay lười và quên cập nhật"*.

**App phải trả lời được 3 câu:**
1. Tháng này mình đã tiêu bao nhiêu, cho những `khoản mục` nào?
2. Còn bao nhiêu tiền đến cuối tháng?
3. Mỗi tháng mình để dành được bao nhiêu?

**Khi app chạy đúng:** mở ra là thấy ngay đã chi bao nhiêu, còn bao nhiêu và tiền đi vào đâu. Không phải tự cộng
trừ, số dư không bị lệch như khi dùng Excel. `Khoản cố định` tự được ghi nên bớt phải nhớ.

**Ràng buộc:**
- Tiền đi ra theo 3 đường: chuyển khoản/QR, thẻ tín dụng, tiền mặt
- Có 6 `ví`: BIDV lương · BIDV tiết kiệm · tiền mặt · thẻ tín dụng VPBank · vàng · chứng khoán
- Tiền vào: lương về BIDV ngày 25 hằng tháng · làm thêm (thỉnh thoảng, chuyển khoản) · thưởng Tết (cuối năm) ·
  cổ tức (6 tháng một lần)
- "Tháng" tính **theo lịch** (từ ngày 1 đến cuối tháng)
- App đưa lên mạng, có đăng nhập, chỉ một tài khoản
- Mọi màn dùng được trên cả máy tính lẫn điện thoại

---

## 2. Nghiệp vụ

**Dạng B: app không có chặng.** Một `khoản ghi` ghi xong là xong. Sai thì sửa hoặc xóa, không có bước duyệt
hay đối chiếu.

### Ba loại `khoản ghi`

| Loại | Gồm | Ví dụ |
|---|---|---|
| **Chi** | số tiền · ngày · 1 `ví` · 1 `khoản mục` chi · ghi chú (không bắt buộc) | 150.000 · 19/10 · tiền mặt · Ăn ngoài |
| **Thu** | số tiền · ngày · 1 `ví` nhận · 1 `khoản mục` thu · ghi chú | 25.000.000 · 25/10 · BIDV lương · Lương |
| **Chuyển** | số tiền · ngày · `ví` chuyển đi → `ví` nhận · ghi chú | 5.000.000 · BIDV lương → chứng khoán |

**`Khoản mục` chi (9):** Đi chợ · Ăn ngoài · Đi lại · Nhà · Mua sắm · Gửi bố mẹ · Giải trí · Sức khỏe · Subscription
**`Khoản mục` thu (4):** Lương · Làm thêm · Thưởng · Cổ tức

### Quy tắc

1. Mỗi `khoản ghi` Chi/Thu có **đúng một** `khoản mục`. Một hóa đơn gồm nhiều thứ thì chọn `khoản mục` chính.
2. Quẹt thẻ VPBank được tính là **Chi vào ngày quẹt**. Thẻ là một `ví` có số dư âm (đang nợ).
3. Trả nợ thẻ, rút tiền ATM, chuyển sang BIDV tiết kiệm / vàng / chứng khoán đều là **Chuyển**, **không tính là chi**.
4. Vàng và chứng khoán **chỉ ghi lúc bỏ tiền vào hoặc rút ra**. Không theo dõi giá, không tính lời lỗ.
5. Mỗi `khoản cố định` có: tên · số tiền · ngày trong tháng · `ví` · `khoản mục`. **Đến ngày đó app tự tạo một
   khoản Chi**, mỗi tháng đúng một lần. Tháng nào số tiền khác (ví dụ tiền điện) thì sửa khoản vừa được tạo.
   Hôm đó không mở app thì lần mở sau app ghi bù, vẫn mang đúng ngày của `khoản cố định`.
6. Số dư ban đầu của mỗi `ví` chỉ khai **một lần** lúc bắt đầu dùng.
7. Mỗi `ví` thuộc một trong hai loại: **tiêu được** (BIDV lương, tiền mặt, VPBank) hoặc **để dành**
   (BIDV tiết kiệm, vàng, chứng khoán).
8. Bỏ trống số tiền, `ví` hoặc `khoản mục` (với Chi/Thu) thì app **báo lỗi và không lưu**.
9. `Khoản mục` thêm, đổi tên và bỏ được. **Đổi tên** thì mọi `khoản ghi` cũ cũng mang tên mới. **Bỏ** nghĩa là
   **ẩn đi**: không còn hiện khi ghi khoản mới, nhưng các `khoản ghi` cũ vẫn giữ `khoản mục` đó, số liệu các tháng
   trước không đổi. Bật lại được.
10. Mỗi `khoản dự chi` có: tên · số tiền · ngày dự kiến · `khoản mục` chi · `ví` (không bắt buộc) · ghi chú.
    Ngày dự kiến là **một ngày cụ thể** (15/11/2026) hoặc **chỉ một tháng** (12/2026) khi chưa biết ngày.
11. Bấm **"Đã chi"** trên một `khoản dự chi` → mở form ghi khoản Chi, điền sẵn số tiền · `khoản mục` · `ví` ·
    ghi chú, ngày điền sẵn là hôm nay. Sửa được trước khi lưu (số tiền thật thường khác số dự kiến). Lưu xong thì
    `khoản dự chi` được đánh dấu **đã chi** và gắn với `khoản ghi` vừa tạo. Xóa `khoản ghi` đó thì `khoản dự chi`
    trở lại **chưa chi**.
12. `Khoản dự chi` chưa chi mà đã qua ngày dự kiến (hoặc qua tháng, nếu chỉ ghi tháng) là **quá hạn**: vẫn hiện,
    nằm trên cùng, cho đến khi bấm "Đã chi" hoặc xóa đi.

### Con số app phải tính ra

Không lưu những con số này. Lần nào mở app cũng tính lại từ các `khoản ghi`.

| Con số | Cách tính |
|---|---|
| Số dư một `ví` | số dư ban đầu + Thu vào `ví` + Chuyển vào − Chi từ `ví` − Chuyển đi |
| Đã chi tháng này | tổng Chi có ngày nằm trong tháng |
| Chi theo `khoản mục` | tổng Chi của từng `khoản mục` trong tháng, xếp từ nhiều đến ít |
| **Còn bao nhiêu thực tế** | tổng số dư các `ví` *tiêu được* − tổng `khoản cố định` (đang bật) có ngày **sau hôm nay** trong tháng này và chưa được ghi |
| **Còn bao nhiêu dự tính** | Còn bao nhiêu thực tế − tổng `khoản dự chi` **chưa chi** có ngày dự kiến trong tháng này (kể cả khoản chỉ ghi tháng này) hoặc đã **quá hạn** |
| Để dành được | tổng Thu trong tháng − Đã chi tháng này |
| Đã cất đi | tổng Chuyển **vào** các `ví` *để dành* − tổng Chuyển **ra** từ các `ví` *để dành*, trong tháng |
| Chưa cất | Để dành được − Đã cất đi |
| Biểu đồ (màn ⑤) | cộng các `khoản ghi` theo ngày, theo tháng, theo `khoản mục` |

---

## 3. Màn hình

5 màn, cộng thêm màn đăng nhập. Mọi màn dùng được trên điện thoại, bố cục thu gọn lại.

**① Tổng quan:** màn mở ra đầu tiên, mặc định là tháng hiện tại, có chọn được tháng khác
- Ba con số trên cùng: **Đã chi** · **Còn bao nhiêu** (hai dòng: *thực tế* và *dự tính*) · **Để dành được**
  (kèm *đã cất / chưa cất*)
- Danh sách `khoản mục` chi của tháng, xếp từ chi nhiều đến ít, mỗi dòng có số tiền
- Bấm vào một `khoản mục` → sang màn ② với danh sách đã lọc theo `khoản mục` đó
- Thẻ **Dự chi**: các `khoản dự chi` chưa chi trong 30 ngày tới và các khoản quá hạn. Bấm vào → sang màn ④

**② Sổ ghi**
- **Máy tính:** dòng nhập liên tục ở trên cùng. Gõ số tiền → chọn Chi/Thu/Chuyển → `khoản mục` → `ví` → Enter,
  rồi dòng mới hiện ra ngay. Ngày điền sẵn là hôm nay và sửa được.
- **Điện thoại:** nút **＋** mở form ghi một khoản với cùng các ô.
- Danh sách `khoản ghi` mới nhất ở trên. Mỗi dòng có **ngày · số tiền · `khoản mục` · `ví` · ghi chú**.
- Lọc theo tháng, `ví`, `khoản mục`. Bấm vào một dòng để sửa hoặc xóa.

**③ Ví & `khoản mục`**
- Nửa trên: danh sách `ví` với **số dư hiện tại** (do app tính). Thẻ VPBank hiện số âm.
  Thêm `ví` mới (tên · loại *tiêu được / để dành* · số dư ban đầu), sửa tên `ví`.
- Nửa dưới: danh sách `khoản mục`, chia hai nhóm *chi* / *thu*. Thêm mới · đổi tên · ẩn / bật lại.

**④ Dự chi:** hai nhóm
- **Một lần** (`khoản dự chi`): danh sách chưa chi, xếp theo ngày dự kiến, khoản quá hạn nằm trên cùng.
  Mỗi dòng: ngày (hoặc tháng) · tên · số tiền · `ví` · `khoản mục` · nút **Đã chi**. Dưới cùng là tổng của 3 tháng
  tới. Thêm, sửa, xóa một `khoản dự chi`. Các khoản đã chi xem được ở phần thu gọn "Đã chi".
- **Hằng tháng** (`khoản cố định`): danh sách tên · số tiền · ngày trong tháng · `ví` · `khoản mục` ·
  **tháng này đã được ghi chưa**. Thêm, sửa, hoặc tắt một `khoản cố định` (ví dụ khi hủy Spotify)

**⑤ Báo cáo thu – chi:** 3 biểu đồ
1. **Thu vs chi theo tháng:** 12 tháng gần nhất
2. **Chi theo ngày:** từng ngày trong tháng đang chọn
3. **Chi theo `khoản mục` qua các tháng:** 12 tháng gần nhất

**Đăng nhập:** một tài khoản duy nhất. Chưa đăng nhập thì không xem được gì.

---

## 4. Dữ liệu

App lưu đúng **5 thứ**:

**1. `ví` — `wallets`**
- `name` · `opening_balance` · `kind` (*spendable* = tiêu được / *savings* = để dành)

**2. `khoản mục` — `categories`**
- `name` · `kind` (*expense* = chi / *income* = thu) · `active` (đang dùng / đã ẩn)
- Có sẵn 9 `khoản mục` chi và 4 `khoản mục` thu khi bắt đầu. Thêm, đổi tên, ẩn trên màn ③

**3. `khoản ghi` — `transactions`**
- `type` (*expense* / *income* / *transfer*) · `amount` · `date` · `wallet` · `category` (với Chi/Thu) ·
  `to_wallet` (chỉ với Chuyển) · `note`
- `recurring` + `period` (tháng nào): chỉ có khi `khoản ghi` được app tự tạo từ một `khoản cố định`

**4. `khoản cố định` — `recurring`**
- `name` · `amount` · `day_of_month` · `wallet` · `category` · `active`

**5. `khoản dự chi` — `planned`**
- `name` · `amount` · `due_date` · `month_only` (chỉ biết tháng: `due_date` là ngày 1 của tháng đó) ·
  `category` · `wallet` (không bắt buộc) · `note`
- `transaction`: `khoản ghi` đã chi cho khoản này. Trống nghĩa là **chưa chi**. Xóa `khoản ghi` thì tự trống lại
- Bảng mới phải có grant cho `authenticated` và row-level security ngay trong `schema.sql` (xem `CLAUDE.md`)

**Quan hệ:**
- Mỗi `khoản ghi` thuộc **đúng một `ví`** (Chuyển thì có thêm một `ví` nhận) và **đúng một `khoản mục`**
  (trừ Chuyển). Một `ví` có rất nhiều `khoản ghi`.
- Một `khoản cố định` sinh ra **mỗi tháng đúng một `khoản ghi`**. Nhờ vậy app biết tháng này đã ghi hay chưa,
  và không ghi trùng.
- Một `khoản dự chi` gắn với **nhiều nhất một `khoản ghi`**.

**Không lưu:** số dư `ví`, đã chi, còn bao nhiêu (thực tế / dự tính), để dành được, đã cất, chưa cất, quá hạn,
số liệu biểu đồ.

---

## 5. Tiêu chí xong

| # | Làm | Phải thấy |
|---|---|---|
| 1 | Ghi *Ăn ngoài 150k, tiền mặt, hôm nay* | Số dư tiền mặt **giảm 150k**, "Đã chi" **tăng 150k**, Ăn ngoài **tăng 150k** |
| 2 | Xóa đúng khoản vừa ghi | Cả ba con số **tự trở về như cũ** |
| 3 | Ghi *quẹt VPBank 300k, Mua sắm* | Nợ thẻ **tăng 300k**, "Đã chi" **tăng 300k**, "Còn bao nhiêu" **giảm 300k** |
| 4 | Ghi *Chuyển BIDV lương → VPBank 300k* (trả thẻ) | Nợ thẻ **về 0**, BIDV lương **giảm 300k**, "Đã chi" **không đổi** |
| 5 | Ghi *Chuyển 5tr BIDV lương → chứng khoán* | "Đã chi" **không đổi**, "Đã cất đi" **tăng 5tr**, "Còn bao nhiêu" **giảm 5tr** |
| 6 | Khai *Spotify 59k, ngày 3, VPBank*, xem vào ngày 1 | "Còn bao nhiêu" **đã trừ sẵn 59k**. Sang ngày 3 app tự ghi khoản đó, "Còn bao nhiêu" **không trừ lần hai**, màn ④ báo **"đã ghi"** |
| 7 | Ghi *Lương 25tr, ngày 25, BIDV lương* | "Để dành được" **tăng 25tr**. Biểu đồ thu vs chi, cột thu tháng này **tăng 25tr** |
| 8 | Ghi một khoản để trống số tiền, `ví` hoặc `khoản mục` | Báo lỗi, **không lưu** |
| 9 | Mở màn ① | `Khoản mục` chi nhiều nhất **nằm trên cùng** |
| 10 | Ghi một khoản 2tr vào ngày 10, mở biểu đồ chi theo ngày | Cột ngày 10 **cao thêm 2tr**. Xóa khoản đó thì cột **trở về như cũ** |
| 11 | Ghi một khoản trên điện thoại, rồi mở máy tính | Khoản đó **đã có trên máy tính** |
| 12 | Mở app ở trình duyệt chưa đăng nhập | Phải **đăng nhập** mới xem được dữ liệu |
| 13 | Thêm `khoản mục` chi "Học tập", rồi ghi một khoản 500k vào đó | "Học tập" **có trong danh sách chọn** khi ghi, màn ① hiện Học tập **500k** |
| 14 | Ẩn `khoản mục` "Giải trí" đã có khoản ghi tháng trước | Khi ghi khoản mới **không còn thấy** Giải trí. Các khoản cũ **vẫn mang chữ Giải trí**, biểu đồ tháng trước **không đổi** |
| 15 | Thêm `khoản dự chi` *Bảo hiểm xe 1,2tr, ngày cuối tháng này* | "Còn bao nhiêu dự tính" **giảm 1,2tr**, "Còn bao nhiêu thực tế" **không đổi**, thẻ Dự chi trên màn ① **có khoản này** |
| 16 | Thêm `khoản dự chi` *Quà Tết 5tr*, chỉ chọn **tháng 12** (đang là tháng 10) | Hiện ở màn ④, tính vào tổng 3 tháng tới, **cả hai** "Còn bao nhiêu" tháng này **không đổi** |
| 17 | Bấm "Đã chi" trên Bảo hiểm xe, sửa số tiền thành 1,25tr rồi lưu | Có khoản Chi 1,25tr ở màn ②, "Đã chi" **tăng 1,25tr**, khoản dự chi **chuyển sang "Đã chi"**, "Còn bao nhiêu dự tính" **không trừ lần hai** |
| 18 | Xóa khoản Chi vừa tạo ở bước 17 | Bảo hiểm xe **trở lại chưa chi** ở màn ④ |
| 19 | Để một `khoản dự chi` qua ngày dự kiến mà chưa bấm "Đã chi" | Khoản đó **hiện "quá hạn"** trên cùng màn ④ và vẫn được trừ vào "Còn bao nhiêu dự tính" |

---

## Đã cân nhắc và hoãn

| Thứ bị hoãn | Lý do |
|---|---|
| **`Khoản nợ`** (ai nợ mình, ghi từng lần trả, tự tính còn nợ, phân loại *thu nhập chưa nhận / tiền cho vay*) | Hiện chỉ có 1 khoản (CINEB nợ lương tháng 3: 5.711.000đ). Khi CINEB trả thì ghi một khoản **Thu, `khoản mục` Lương** |
| **Tổng tài sản** (con số trên màn Ví + biểu đồ qua các tháng) | Tạm thời chưa cần |
| **Nạp file sao kê** BIDV / VPBank để tự tạo `khoản ghi` | Phải tải file hằng tuần, chưa biết mẫu file của từng ngân hàng, dựng lâu hơn. Bản nâng cấp tự nhiên khi đã có mẫu file thật |
| Theo dõi giá vàng / chứng khoán, tính lời lỗ | Chỉ cần ghi lúc bỏ tiền vào hoặc rút ra |
| Chia một `khoản ghi` cho nhiều `khoản mục` | Chọn `khoản mục` chính là đủ, ghi nhanh hơn |
| Chia nhỏ `khoản mục` (trừ Ăn uống) | Đi lại, Nhà… chỉ cần một tầng. Muốn chi tiết thì gõ ghi chú |
| Đánh dấu "đã đối chiếu với sao kê" | Ghi xong là xong |
| Đặt mức chi tối đa cho tháng / cho `khoản mục` | Không chọn; "Còn bao nhiêu" tính theo tiền thật trừ `khoản cố định` |
| **Để dành dần cho một `khoản dự chi` lớn** (ví dụ chia 20tr ra mỗi tháng cần để ra bao nhiêu) | Chưa cần ở vòng 2 |
