export const storeInfo = {
  name: "Pozaa - Tea & Coffee",
  logo: "https://i.ibb.co/7dTJg4km/Logo.png",
  banner: "https://i.pinimg.com/1200x/2b/5f/43/2b5f43b39083af8dffc4b6f0dcebc4c8.jpg",
  hotline: "0939944931",
  address: "khu phố 3, Phường Thới Hòa, Thành phố Bến Cát, Tỉnh Bình Dương, Việt Nam",
  bankName: "MBbank",
  bankCode: "MB",
  bankAccount: "00939944931",
  bankOwner: "PHAN ANH TUAN",
  qrTemplate: "https://img.vietqr.io/image/MB-00939944931-compact.png",
  openHours: "8:00 – 23:00 mỗi ngày",
  description: "Thanh mát vị trà, đậm đà hương sữa",
  zalo: "0939944931",
  facebook: "",
  mapsUrl: ""
};

export const categories = [
  {
    id: "tra-sua-hong-tra",
    name: "Trà Sữa Hồng Trà Đài Loan",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=600&auto=format&fit=crop", // dynamic banner/image for section
  },
  {
    id: "tra-sua-kem-trung",
    name: "Trà Sữa Kem Trứng",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "tra-sua-pho-mai",
    name: "Trà Sữa Phô Mai",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "an-vat",
    name: "Món Ăn Vặt",
    image: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=600&auto=format&fit=crop",
  }
];

export const productsRaw = [
  // Trà Sữa Hồng Trà Đài Loan
  {
    id: "SP001",
    name: "Trà Sữa Pozaa Chưa Topping",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 20000,
    discountPrice: null,
    unit: "Size M",
    description: "Trà sữa truyền thống Pozaa thơm ngon, đậm đà vị trà đen thượng hạng.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP002",
    name: "Trà Sữa Pozaa Chưa Topping",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 27000,
    discountPrice: null,
    unit: "Size L",
    description: "Trà sữa truyền thống Pozaa thơm ngon, đậm đà vị trà đen thượng hạng.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP003",
    name: "Trà Sữa Trân Châu Hoàng Gia",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 25000,
    discountPrice: null,
    unit: "Size M",
    description: "Hương vị trà sữa Pozaa kết hợp trân châu đen hoàng gia dẻo dai ngọt thanh.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP004",
    name: "Trà Sữa Trân Châu Hoàng Gia",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 32000,
    discountPrice: null,
    unit: "Size L",
    description: "Hương vị trà sữa Pozaa kết hợp trân châu đen hoàng gia dẻo dai ngọt thanh.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP005",
    name: "Trà Sữa Trân Châu Đường Đen",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 30000,
    discountPrice: null,
    unit: "Size M",
    description: "Sự kết hợp hoàn hảo giữa sữa tươi thanh trùng, đường đen mật mía thơm lừng và trân châu dai giòn.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: false
  },
  {
    id: "SP006",
    name: "Trà Sữa Trân Châu Đường Đen",
    category: "Trà Sữa Hồng Trà Đài Loan",
    price: 35000,
    discountPrice: null,
    unit: "Size L",
    description: "Sự kết hợp hoàn hảo giữa sữa tươi thanh trùng, đường đen mật mía thơm lừng và trân châu dai giòn.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: false
  },
  
  // Trà Sữa Kem Trứng
  {
    id: "SP025",
    name: "Trà Sữa Thái Xanh Kem Trứng Cháy",
    category: "Trà Sữa Kem Trứng",
    price: 32000,
    discountPrice: null,
    unit: "Size M",
    description: "Trà Thái xanh thơm mát đặc trưng, phủ lớp kem trứng béo ngậy khè lửa thơm phức.",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP026",
    name: "Trà Sữa Thái Xanh Kem Trứng Cháy",
    category: "Trà Sữa Kem Trứng",
    price: 37000,
    discountPrice: null,
    unit: "Size L",
    description: "Trà Thái xanh thơm mát đặc trưng, phủ lớp kem trứng béo ngậy khè lửa thơm phức.",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP027",
    name: "Trà Sữa Kem Trứng Dừa Nướng",
    category: "Trà Sữa Kem Trứng",
    price: 35000,
    discountPrice: null,
    unit: "Size M",
    description: "Trà sữa đậm đà quyện với lớp kem trứng bùi béo và vụn dừa nướng giòn rụm thơm lừng.",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: true
  },
  {
    id: "SP028",
    name: "Trà Sữa Kem Trứng Dừa Nướng",
    category: "Trà Sữa Kem Trứng",
    price: 39000,
    discountPrice: null,
    unit: "Size L",
    description: "Trà sữa đậm đà quyện với lớp kem trứng bùi béo và vụn dừa nướng giòn rụm thơm lừng.",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: true
  },

  // Trà Sữa Phô Mai
  {
    id: "SP033",
    name: "Trà Sữa Ôlong Phô Mai Tươi",
    category: "Trà Sữa Phô Mai",
    price: 30000,
    discountPrice: null,
    unit: "Size M",
    description: "Trà Ôlong thơm dịu mát kết hợp lớp phô mai viên béo mượt, ngon khó cưỡng.",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: true
  },
  {
    id: "SP034",
    name: "Trà Sữa Ôlong Phô Mai Tươi",
    category: "Trà Sữa Phô Mai",
    price: 35000,
    discountPrice: null,
    unit: "Size L",
    description: "Trà Ôlong thơm dịu mát kết hợp lớp phô mai viên béo mượt, ngon khó cưỡng.",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: true
  },

  // Ăn vặt
  {
    id: "SP101",
    name: "Bánh Tráng Trộn Long An",
    category: "Món Ăn Vặt",
    price: 20000,
    discountPrice: null,
    unit: "Phần",
    description: "Bánh tráng trộn muối tôm Tây Ninh, khô bò, trứng cút, hành phi và sốt tắc chua ngọt hấp dẫn.",
    image: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP102",
    name: "Nem Chua Rán Giòn Hộp 5 Cái",
    category: "Món Ăn Vặt",
    price: 25000,
    discountPrice: null,
    unit: "Hộp",
    description: "Nem chua lăn bột chiên xù giòn rụm bên ngoài, dai mềm ngọt thịt bên trong, ăn kèm tương ớt cay nồng.",
    image: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: false,
    isHot: true
  },
  {
    id: "SP103",
    name: "Khoai Tây Chiên Lắc Phô Mai",
    category: "Món Ăn Vặt",
    price: 22000,
    discountPrice: 18000,
    unit: "Phần",
    description: "Khoai tây chiên vàng giòn rụm, lắc đều với bột phô mai mặn ngọt thơm béo.",
    image: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=300&auto=format&fit=crop",
    status: "Đang bán",
    isNew: true,
    isHot: false
  }
];

export const toppings = [
  { id: 1, type: "Đồ uống", name: "Pudding/ Sương Sáo", price: 6000 },
  { id: 2, type: "Đồ uống", name: "Trân Châu Đen", price: 6000 },
  { id: 3, type: "Đồ uống", name: "Thạch Trái Cây", price: 6000 },
  { id: 4, type: "Đồ uống", name: "Phô Mai Chân Mèo", price: 8000 },
  { id: 5, type: "Đồ uống", name: "Hạt Đác", price: 8000 },
  { id: 6, type: "Đồ uống", name: "Thạch Phô Mai Tươi", price: 8000 },
  { id: 7, type: "Đồ uống", name: "Trân Châu Trắng", price: 8000 },
  { id: 8, type: "Đồ uống", name: "Kem Cheese/ Kem Trứng", price: 8000 },
  { id: 9, type: "Đồ uống", name: "Bánh Flan", price: 8000 },
  { id: 10, type: "Đồ uống", name: "Đậu Đỏ", price: 8000 },
  { id: 11, type: "Đồ uống", name: "Phô Mai Viên Bò Cười", price: 10000 },
  { id: 12, type: "Đồ uống", name: "Thạch Nổ Củ Năng", price: 10000 },
  { id: 13, type: "Đồ uống", name: "Bánh Phô Mai Donut", price: 12000 }
];

export const events = [
  {
    id: "EV001",
    title: "Đồng giá Trà sữa 25K",
    description: "Ưu đãi mừng khai trương: Đồng giá 25.000đ cho tất cả trà sữa Size M có trong menu. Duy nhất tuần này!",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=800&auto=format&fit=crop",
    type: "Khuyến mãi",
    startDate: "2026-06-20",
    endDate: "2026-06-27",
    status: "Hiển thị"
  },
  {
    id: "EV002",
    title: "Tặng Topping Tự Chọn",
    description: "Nhập mã MUALATANG khi đặt hàng trên Web để nhận ngay 1 phần trân châu đen hoặc thạch nha đam miễn phí cho mỗi ly trà sữa.",
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=800&auto=format&fit=crop",
    type: "Khuyến mãi",
    startDate: "2026-06-21",
    endDate: "2026-07-05",
    status: "Hiển thị"
  }
];
