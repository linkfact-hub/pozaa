/* ═══════════════════════════════════════════════════════════════
  Google Apps Script Backend (Bản sửa lỗi setHeaders cho Apps Script)
   Luồng: Web → Apps Script → AppSheet API → Google Sheets
         (Người dùng nhận thông báo qua AppSheet mobile)
═══════════════════════════════════════════════════════════════ */

// ── CẤU HÌNH – CHỈ SỬA PHẦN NÀY ──────────────────────────────
const CONFIG = {
  // AppSheet App ID (lấy trong AppSheet → App → Info → App ID)
  APPSHEET_APP_ID: "YOUR_APPSHEET_APP_ID",

  // AppSheet Application Access Key (AppSheet → Account → Integrations → Access Keys)
  APPSHEET_ACCESS_KEY: "YOUR_APPSHEET_ACCESS_KEY",

  // Groq API Key (https://console.groq.com → API Keys)
  GROQ_API_KEY: "YOUR_GROQ_API_KEY",

  // Tên các tab trong Google Sheets (phải khớp chính xác)
  SHEETS: {
    STORE_INFO:    "Thông tin cửa hàng",
    PRODUCTS:      "Sản phẩm",
    TOPPINGS:      "Topping", 
    ORDERS:        "Đơn hàng",
    ORDER_DETAILS: "Đơn hàng chi tiết",
    MEMBERS:       "HoiVien",
    REVIEWS:       "Đánh giá",
    SHOPEE:        "Shopee",
    EVENTS:        "Sự kiện",
  }
};

// ── PHẢN HỒI JSON (Bỏ setHeaders lỗi của Apps Script - Google tự động handle CORS) ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════
// doGet – Trả về toàn bộ dữ liệu cần thiết cho web
// ══════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    return jsonResponse({
      success: true,
      cuaHang:  layThongTinCuaHang(ss),
      sanPham:  layDanhSachSheet(ss, CONFIG.SHEETS.PRODUCTS),
      topping:  layDanhSachSheet(ss, CONFIG.SHEETS.TOPPINGS), // Thêm trả về topping cho Web
      shopee:   layDanhSachSheet(ss, CONFIG.SHEETS.SHOPEE),
      suKien:   layDanhSachSheet(ss, CONFIG.SHEETS.EVENTS),
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════
// doPost – Router phân nhánh theo payload.action
// ══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    switch (action) {
      case "datHang":        return xuLyDatHang(payload);
      case "dangKyHoiVien":  return xuLyDangKyHoiVien(payload);
      case "guiDanhGia":     return xuLyDanhGia(payload);
      case "chatAI":         return xuLyChatAI(payload);
      default:
        return jsonResponse({ success: false, error: "Action không hợp lệ: " + action });
    }

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════
// ĐẶT HÀNG
// ══════════════════════════════════════════════════════════════
function xuLyDatHang(p) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const thoiGian = Utilities.formatDate(
    new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"
  );
  const maDon    = p.maDon || ("DH" + Date.now().toString().slice(-10));
  const tongTien = Number(p.tongTien);

  // Reconstruct detailed description for orders main sheet
  const chiTiet = (p.cart || [])
    .map(i => {
      const toppingText = (i.toppings || []).length > 0
        ? ` (Topping: ${i.toppings.map(t => `${t.name} x${t.qty}`).join(', ')})`
        : '';
      const noteText = i.ghiChu ? ` [Ghi chú: ${i.ghiChu}]` : '';
      return `${i.tenSanPham}${toppingText}${noteText} x${i.soLuong}`;
    })
    .join(" | ");

  // 1. Ghi tab "Đơn hàng" qua AppSheet API → push notification
  const rowDH = {
    "Mã đơn":                 maDon,
    "Thời gian":              thoiGian,
    "Họ tên":                 String(p.hoTen || ""),
    "Số điện thoại":          String(p.soDienThoai || ""),
    "Địa chỉ":                String(p.diaChiNhanHang || "Tự lấy"),
    "Hình thức":              p.hinhThuc === "giaohang" ? "Giao hàng" : "Tự lấy",
    "Chi tiết đơn":           chiTiet,
    "Tổng tiền":              tongTien,
    "TT thanh toán":          p.phuongThucThanhToan === "CK" ? "Chuyển khoản" : "COD",
    "Trạng thái":             "Chờ xác nhận",
    "Ghi chú":                String(p.ghiChu || ""),
  };

  const resultDH = appSheetAddRows(CONFIG.SHEETS.ORDERS, [rowDH]);
  if (!resultDH.ok) {
    Logger.log("AppSheet Đơn hàng lỗi: " + resultDH.error);
    // Fallback ghi thẳng Sheets (Không lệch cột)
    const sheetDH = ss.getSheetByName(CONFIG.SHEETS.ORDERS);
    if (sheetDH) {
      const orderRowData = {
        "ID": sheetDH.getLastRow(),
        "Mã đơn": maDon,
        "Thời gian": thoiGian,
        "Họ tên": String(p.hoTen || ""),
        "Số điện thoại": String(p.soDienThoai || ""),
        "Địa chỉ": String(p.diaChiNhanHang || "Tự lấy"),
        "Hình thức": p.hinhThuc === "giaohang" ? "Giao hàng" : "Tự lấy",
        "Chi tiết đơn": chiTiet,
        "Tổng tiền": tongTien,
        "TT thanh toán": p.phuongThucThanhToan === "CK" ? "Chuyển khoản" : "COD",
        "Trạng thái": "Chờ xác nhận",
        "Ghi chú": String(p.ghiChu || "")
      };
      writeRowByHeader(sheetDH, orderRowData);
      Logger.log("Đã ghi đè trực tiếp đơn hàng vào Google Sheet theo cột.");
    }
  }

  // 2. Ghi tab "Đơn hàng chi tiết" qua AppSheet API
  const sheetCT   = ss.getSheetByName(CONFIG.SHEETS.ORDER_DETAILS);
  const startRow  = sheetCT ? sheetCT.getLastRow() : 1;

  // Split each cart item: 1 row for base product, 1 row for each topping
  const rowsCT = [];
  (p.cart || []).forEach(item => {
    const productGia = Number(item.giaBan || 0);
    const productQty = Number(item.soLuong || 0);
    const productGhiChu = item.ghiChu ? ` [Ghi chú: ${item.ghiChu}]` : '';

    // Product Base Row
    rowsCT.push({
      "Mã đơn":       maDon,
      "Họ tên":       String(p.hoTen || ""),
      "Số điện thoại":String(p.soDienThoai || ""),
      "SP_id":        String(item.SP_id || ""),
      "Sản phẩm":     String(item.tenSanPham || "") + productGhiChu,
      "Danh mục":     String(item.danhMuc || ""),
      "ĐVT":          String(item.donViTinh || ""),
      "Số lượng":     productQty,
      "Đơn giá":      productGia,
      "Thành tiền":   productQty * productGia,
      "Topping_id":   "",
      "Topping":      "",
      "Thời gian":    thoiGian,
    });

    // Toppings Rows
    (item.toppings || []).forEach(topping => {
      const toppingQty = Number(topping.qty || 0);
      const toppingPrice = Number(topping.price || 0);
      const totalToppingQty = productQty * toppingQty;

      rowsCT.push({
        "Mã đơn":       maDon,
        "Họ tên":       String(p.hoTen || ""),
        "Số điện thoại":String(p.soDienThoai || ""),
        "SP_id":        String(item.SP_id || ""),
        "Sản phẩm":     String(item.tenSanPham || "") + ` (Topping: ${topping.name})`,
        "Danh mục":     String(item.danhMuc || ""),
        "ĐVT":          "Phần",
        "Số lượng":     totalToppingQty,
        "Đơn giá":      toppingPrice,
        "Thành tiền":   totalToppingQty * toppingPrice,
        "Topping_id":   String(topping.id || ""),
        "Topping":      String(topping.name || ""),
        "Thời gian":    thoiGian,
      });
    });
  });

  const resultCT = appSheetAddRows(CONFIG.SHEETS.ORDER_DETAILS, rowsCT);
  if (!resultCT.ok) {
    Logger.log("AppSheet Chi tiết lỗi: " + resultCT.error);
    // Fallback ghi thẳng Sheets (Không lệch cột)
    if (sheetCT) {
      rowsCT.forEach((row, idx) => {
        const detailRowData = {
          "ID": startRow + idx,
          "Mã đơn": maDon,
          "Họ tên": row["Họ tên"],
          "Số điện thoại": row["Số điện thoại"],
          "SP_id": row["SP_id"],
          "Sản phẩm": row["Sản phẩm"],
          "Danh mục": row["Danh mục"],
          "ĐVT": row["ĐVT"],
          "Số lượng": row["Số lượng"],
          "Đơn giá": row["Đơn giá"],
          "Thành tiền": row["Thành tiền"],
          "Topping_id": row["Topping_id"],
          "Topping": row["Topping"],
          "Thời gian": thoiGian
        };
        writeRowByHeader(sheetCT, detailRowData);
      });
      Logger.log("Đã ghi đè trực tiếp chi tiết đơn hàng vào Google Sheet theo cột.");
    }
  }

  return jsonResponse({ success: true, maDon, message: "Đặt hàng thành công!" });
}

// ══════════════════════════════════════════════════════════════
// ĐĂNG KÝ HỘI VIÊN
// ══════════════════════════════════════════════════════════════
function xuLyDangKyHoiVien(p) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const sheet    = ss.getSheetByName(CONFIG.SHEETS.MEMBERS);
  const thoiGian = layThoiGianVN();
  const sdt      = String(p.soDienThoai || "").replace(/\s/g, "");

  if (!sheet) return jsonResponse({ success: false, error: "Không tìm thấy sheet HoiVien" });

  // Kiểm tra trùng SĐT
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).replace(/\s/g, "") === sdt) {
      return jsonResponse({
        success: false,
        error: "SĐT đã đăng ký hội viên rồi!",
      });
    }
  }

  const maHV = "HV" + Date.now().toString().slice(-6);

  const memberRowData = {
    "Mã HV": maHV,
    "Thời gian": thoiGian,
    "Họ tên": String(p.hoTen || ""),
    "SĐT": sdt,
    "Ngày sinh": String(p.ngaySinh || ""),
    "Giới tính": String(p.gioiTinh || ""),
    "Địa chỉ": String(p.diaChi || ""),
    "Điểm tích lũy": 10, 
    "Trạng thái": "Hoạt động"
  };
  writeRowByHeader(sheet, memberRowData);

  return jsonResponse({
    success: true,
    maHV,
    hoTen: p.hoTen,
    diemTichLuy: 10,
    message: "Đăng ký hội viên thành công! Tặng 10 điểm.",
  });
}

// ══════════════════════════════════════════════════════════════
// GỬI ĐÁNH GIÁ
// ══════════════════════════════════════════════════════════════
function xuLyDanhGia(p) {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const sheet    = ss.getSheetByName(CONFIG.SHEETS.REVIEWS);
  const thoiGian = layThoiGianVN();

  if (!sheet) return jsonResponse({ success: false, error: "Không tìm thấy sheet Đánh giá" });

  const reviewRowData = {
    "ID": "DG" + Date.now().toString().slice(-8),
    "Mã đơn": String(p.maDon || ""),
    "SĐT": String(p.soDienThoai || ""),
    "Tên SP": String(p.tenSanPham || ""),
    "Sao": Number(p.soSao || 5),
    "Bình luận": String(p.binhLuan || ""),
    "Thời gian": thoiGian
  };
  writeRowByHeader(sheet, reviewRowData);

  return jsonResponse({ success: true, message: "Cảm ơn bạn đã đánh giá!" });
}

// ══════════════════════════════════════════════════════════════
// CHAT AI (Groq proxy) – v3
// ══════════════════════════════════════════════════════════════
function xuLyChatAI(p) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const cuaHang = layThongTinCuaHang(ss);
  const sanPham = layDanhSachSheet(ss, CONFIG.SHEETS.PRODUCTS);
  const suKien  = layDanhSachSheet(ss, CONFIG.SHEETS.EVENTS);

  const homNay = new Date();

  // Menu sản phẩm cửa hàng
  const menuText = sanPham
    .filter(sp => sp["Trạng thái"] === "Còn hàng" || sp["Trạng thái"] === "Đang bán")
    .map(sp => {
      const giaGoc = Number(sp["Giá bán"]) || 0;
      const giaKM  = Number(sp["Giá khuyến mãi"]) || 0;
      const dangKM = giaKM > 0 && giaKM < giaGoc;
      const giaText = dangKM
        ? `${giaKM.toLocaleString("vi-VN")}đ (giá KM, giá gốc ${giaGoc.toLocaleString("vi-VN")}đ)`
        : `${giaGoc.toLocaleString("vi-VN")}đ`;
      return `- ${sp["Tên sản phẩm"]} (${sp["Đơn vị tính"]}): ${giaText}`;
    })
    .join("\n");

  // Sự kiện đang diễn ra
  const suKienText = suKien
    .filter(sk => {
      if (sk["Trạng thái"] !== "Đang diễn ra" && sk["Trạng thái"] !== "Hiển thị") return false;
      if (sk["Ngày kết thúc"]) {
        const ngayKetThuc = new Date(sk["Ngày kết thúc"]);
        if (!isNaN(ngayKetThuc) && ngayKetThuc < homNay) return false;
      }
      return true;
    })
    .map(sk => `- ${sk["Tiêu đề"]}: ${sk["Mô tả"]}`)
    .join("\n");

  const systemPrompt = `Bạn là nhân viên chăm sóc khách hàng của cửa hàng "${cuaHang["Tên cửa hàng"] || "Pozaa Tea"}".
Slogan: ${cuaHang["Slogan"] || ""}
Địa chỉ: ${cuaHang["Địa chỉ"] || ""}
SĐT: ${cuaHang["Số điện thoại"] || ""}
Giờ mở cửa: ${cuaHang["Giờ mở cửa"] || ""}
Facebook: ${cuaHang["Facebook"] || ""}

──────────────────────────────────────
MENU CỬA HÀNG (mua trực tiếp / giao hàng):
${menuText || "Hiện chưa có sản phẩm nào còn hàng"}

──────────────────────────────────────
KHUYẾN MÃI ĐANG DIỄN RA:
${suKienText || "Hiện tại không có sự kiện hay khuyến mãi đặc biệt nào"}

──────────────────────────────────────
PHONG CÁCH TRẢ LỜI (bắt buộc tuân thủ):
- Xưng "mình" hoặc "shop", gọi khách là "bạn" hoặc "anh/chị" — giữ giọng văn chuyên nghiệp, lịch sự, ấm áp như một nhân viên CSKH thực sự, không quá suồng sã, không lạm dụng emoji (tối đa 1-2 emoji phù hợp mỗi câu trả lời).
- Câu trả lời ngắn gọn, đi thẳng vào điều khách cần, tránh lan man.
- Khi khách hỏi về sản phẩm có trong MENU: trả lời tên, giá (ghi rõ nếu đang có giá khuyến mãi), gợi ý "Bạn bấm vào ảnh sản phẩm trên web để xem chi tiết và thêm vào giỏ hàng nhé!"
- Khi khách hỏi mua online / ship xa: miễn ship từ 3 ly (trong phạm vi 3km).
- Khi khách hỏi đặt hàng tại chỗ / giao gần: hướng dẫn dùng giỏ hàng trên web.

──────────────────────────────────────
QUY TẮC BẮT BUỘC VỀ DỮ LIỆU (tuyệt đối không vi phạm):
- CHỈ trả lời dựa trên thông tin được cung cấp ở trên (menu, sự kiện, thông tin cửa hàng). KHÔNG được tự suy diễn, KHÔNG bịa thêm sản phẩm, giá, khuyến mãi, chính sách, hay thông tin nào không có trong dữ liệu trên.
- Nếu khách hỏi về sản phẩm KHÔNG có trong MENU ở trên: trả lời thật rằng hiện cửa hàng chưa có sản phẩm đó, đừng đoán hoặc gợi ý sản phẩm tương tự không có thật.
- Nếu khách hỏi về khuyến mãi nhưng phần KHUYẾN MÃI ĐANG DIỄN RA ở trên ghi "không có": trả lời thật là hiện chưa có chương trình ưu đãi nào, hẹn khách theo dõi thêm, không bịa ra ưu đãi giả.
- Nếu khách hỏi điều gì đó hoàn toàn không có trong dữ liệu trên: thành thật nói rằng mình chưa có thông tin chính xác về việc này, và đề nghị khách liên hệ trực tiếp qua số điện thoại hoặc Facebook của shop để được hỗ trợ chính xác nhất. Tuyệt đối không đoán hoặc bịa câu trả lời nghe có vẻ hợp lý.`;

  const history  = p.history || [];
  const messages = history.length > 0
    ? [
        { role: "user",      content: systemPrompt + "\n\n---\nKhách hỏi: " + history[0].content },
        { role: "assistant", content: "Tôi đã hiểu thông tin cửa hàng và sẵn sàng hỗ trợ khách hàng." },
        ...history.slice(1)
      ]
    : [{ role: "user", content: systemPrompt }];

  const response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + CONFIG.GROQ_API_KEY,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      max_tokens:  400,
      temperature: 0.3, 
      messages:    messages,
    }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  const reply  = result?.choices?.[0]?.message?.content
    || "Xin lỗi bạn, hiện mình chưa thể trả lời câu hỏi này. Bạn vui lòng liên hệ trực tiếp shop để được hỗ trợ nhé! 🙏";

  return jsonResponse({ success: true, reply });
}

// ══════════════════════════════════════════════════════════════
// THÊM MỚI: APPSHEET API HỖ TRỢ THÊM DỮ LIỆU
// ══════════════════════════════════════════════════════════════
function appSheetAddRows(tableName, rows) {
  const apiUrl = `https://api.appsheet.com/api/v2/apps/${CONFIG.APPSHEET_APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;

  const payload = {
    "Action": "Add",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": rows
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'applicationAccessKey': CONFIG.APPSHEET_ACCESS_KEY
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode >= 200 && statusCode < 300) {
      return { ok: true, data: JSON.parse(responseText) };
    } else {
      return { ok: false, error: responseText };
    }
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════

// Đọc tab dạng key-value (cột A = Trường, cột B = Giá trị)
function layThongTinCuaHang(ss) {
  const sheet  = ss.getSheetByName(CONFIG.SHEETS.STORE_INFO);
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  const result = {};
  const banners = [];

  values.forEach(row => {
    if (!row[0]) return;
    const key = String(row[0]).trim();
    const val = row[1];

    if (key.toLowerCase().startsWith('banner_') && key.toLowerCase() !== 'banner_mode') {
      if (val) banners.push(String(val).trim());
    } else {
      result[key] = val;
    }
  });

  if (banners.length > 0) result['banners'] = banners;
  return result;
}

// Đọc tab dạng bảng (hàng 1 = header)
function layDanhSachSheet(ss, sheetName) {
  const sheet  = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(cell => cell !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
}

// Hàm ghi dòng dữ liệu động dựa theo tên tiêu đề cột (Bất kể vị trí cột)
function writeRowByHeader(sheet, dataObject) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var newRowValues = [];
  
  var normalizedData = {};
  for (var key in dataObject) {
    normalizedData[normalizeString(key)] = dataObject[key];
  }
  
  for (var i = 0; i < headers.length; i++) {
    var headerName = normalizeString(headers[i]);
    if (headerName && normalizedData.hasOwnProperty(headerName)) {
      newRowValues.push(normalizedData[headerName]);
    } else {
      newRowValues.push("");
    }
  }
  
  sheet.appendRow(newRowValues);
}

// Chuẩn hóa chuỗi để so khớp cột
function normalizeString(str) {
  if (!str) return "";
  var from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  var to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
  var newStr = str.toString().toLowerCase().trim();
  for (var i = 0; i < from.length; i++) {
    newStr = newStr.replace(new RegExp(from[i], 'g'), to[i]);
  }
  return newStr.replace(/[^a-z0-9]/g, ""); 
}

// Chuẩn hóa key tiếng Việt sang dạng camelCase gọn gàng cho Frontend map
function toCamelCase(str) {
  if (!str) return "";
  var from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  var to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
  var newStr = str.toString().toLowerCase().trim();
  for (var i = 0; i < from.length; i++) {
    newStr = newStr.replace(new RegExp(from[i], 'g'), to[i]);
  }
  return newStr
    .replace(/[^a-z0-9\s]/g, '')
    .split(/[\s_]+/)
    .map(function(word, index) {
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

// Thời gian Việt Nam chuẩn
function layThoiGianVN() {
  return Utilities.formatDate(
    new Date(),
    "Asia/Ho_Chi_Minh",
    "dd/MM/yyyy HH:mm:ss"
  );
}

// ══════════════════════════════════════════════════════════════
// SETUP – Chạy 1 lần để tạo cấu trúc Sheets (Đã thêm cấu trúc Topping)
// ══════════════════════════════════════════════════════════════
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    [CONFIG.SHEETS.STORE_INFO]: null, 

    [CONFIG.SHEETS.PRODUCTS]: [
      "ID","Tên sản phẩm","Danh mục","Giá bán","Đơn vị tính",
      "Link hình ảnh","Trạng thái","Mô tả"
    ],

    [CONFIG.SHEETS.TOPPINGS]: [
      "ID","Nhóm chính","Tên topping","Giá","Giá khuyến mãi","Đơn vị tính"
    ],

    [CONFIG.SHEETS.ORDERS]: [
      "ID","Mã đơn","Thời gian","Họ tên","Số điện thoại",
      "Địa chỉ","Hình thức","Chi tiết đơn","Tổng tiền",
      "TT thanh toán","Trạng thái","Ghi chú"
    ],

    [CONFIG.SHEETS.ORDER_DETAILS]: [
      "ID","Mã đơn","Họ tên","Số điện thoại","SP_id",
      "Sản phẩm","Danh mục","ĐVT","Số lượng","Đơn giá",
      "Thành tiền","Topping_id","Topping","Thời gian"
    ],

    [CONFIG.SHEETS.MEMBERS]: [
      "Mã HV","Thời gian","Họ tên","SĐT","Ngày sinh",
      "Giới tính","Địa chỉ","Điểm tích lũy","Trạng thái"
    ],

    [CONFIG.SHEETS.REVIEWS]: [
      "ID","Mã đơn","SĐT","Tên SP","Sao","Bình luận","Thời gian"
    ],

    [CONFIG.SHEETS.SHOPEE]: [
      "ID","Tên sản phẩm","Hình ảnh","Link Affiliate"
    ],

    [CONFIG.SHEETS.EVENTS]: [
      "ID","Tiêu đề","Loại","Mô tả","Hình ảnh",
      "Ngày bắt đầu","Ngày kết thúc","Nhãn nổi bật",
      "Màu nền","Liên kết","Trạng thái"
    ],
  };

  Object.entries(schemas).forEach(([name, headers]) => {
    if (!headers) return;
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log("✅ Đã tạo tab: " + name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#1a0a00")
        .setFontColor("#C8922A")
        .setFontWeight("bold");
    }
  });

  // Fix format số cho các cột tiền tệ
  const fixNumberFormat = (sheetName, cols) => {
    const s = ss.getSheetByName(sheetName);
    if (!s) return;
    cols.forEach(col => {
      s.getRange(2, col, 1000).setNumberFormat("#,##0");
    });
  };

  fixNumberFormat(CONFIG.SHEETS.ORDERS, [9]);          // Tổng tiền
  fixNumberFormat(CONFIG.SHEETS.ORDER_DETAILS, [10, 11]); // Đơn giá, Thành tiền
  fixNumberFormat(CONFIG.SHEETS.PRODUCTS, [4]);         // Giá bán
  fixNumberFormat(CONFIG.SHEETS.TOPPINGS, [4]);         // Giá topping
  fixNumberFormat(CONFIG.SHEETS.MEMBERS, [8]);          // Điểm tích lũy

  SpreadsheetApp.getUi().alert(
    "✅ Setup hoàn tất!\n\nCác tab đã được tạo:\n" +
    Object.keys(schemas).join("\n") +
    "\n\nBước tiếp: Điền dữ liệu vào tab 'Thông tin cửa hàng' và 'Sản phẩm'."
  );
}
