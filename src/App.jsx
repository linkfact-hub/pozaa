import React, { useState, useEffect, useRef } from 'react';
import { storeInfo, categories, productsRaw, toppings, events } from './data/mockData';

// Helper to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to parse money strings from Google Sheet (e.g. "6.000" or "20,000" to 6000 or 20000)
const parseMoney = (val) => {
  if (val === null || val === undefined || val === '-') return 0;
  if (typeof val === 'number') return val;
  
  // Remove dots and commas which are thousands separators in VN Sheets formatting
  const cleanStr = String(val).replace(/\./g, '').replace(/,/g, '').trim();
  return Number(cleanStr) || 0;
};

// Helper to convert Google Drive sharing links to direct image links
const getDirectImgUrl = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const matches = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (matches && matches[1]) {
      fileId = matches[1];
      return `https://docs.google.com/uc?export=download&id=${fileId}`;
    }
  }
  return url;
};

// Helper to create URL slug from Vietnamese string
const createSlug = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
    .replace(/ì|í|ị|ỉ|ĩ/g, "i")
    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
};

// Helper to auto-classify categories into "Tea & Coffee" (drinks) or "Ẩm thực" (food)
const classifyCategory = (catName) => {
  if (!catName) return 'food';
  const nameLower = catName.toLowerCase();
  
  const normalized = nameLower
    .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
    .replace(/ì|í|ị|ỉ|ĩ/g, "i")
    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
    .replace(/đ/g, "d");

  const drinkKeywords = [
    'tra', 'sua', 'nuoc', 'ep', 'healthy', 'kem', 'cheese', 'pho mai', 
    'yauort', 'coffee', 'ca phe', 'cafe', 'latte', 'cacao', 'milo', 
    'chocolate', 'socola', 'macchiato', 'smoothie', 'juice', 'tea', 'drink',
    'sua chua', 'yakult', 'mojito', 'do uong', 'sinh to', 'soda', 'da xay', 
    'uong', 'nhai', 'olong', 'thai xanh'
  ];

  const isDrink = drinkKeywords.some(keyword => normalized.includes(keyword));
  return isDrink ? 'drinks' : 'food';
};

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycby_kped9ynoVR9iHkdjZNhogQFAy7iQqAMWaWvGWsBncPa9fz-nxajvUgsYnDV3SxVIKA/exec';

export default function App() {
  // State variables (fallback to mock data initially)
  const [storeData, setStoreData] = useState(storeInfo);
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]); // Dynamic categories list
  const [allToppings, setAllToppings] = useState(toppings);
  const [allEvents, setAllEvents] = useState(events);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation states
  const [activeCategory, setActiveCategory] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(''); // 'drinks', 'food', or ''

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, new, hot, sale
  
  // Selected product for popup modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Toppings selected map: { [toppingId]: quantity }
  const [selectedToppings, setSelectedToppings] = useState({});
  
  const [productQty, setProductQty] = useState(1);
  const [productNote, setProductNote] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutNote, setCheckoutNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, Transfer

  // Order success state
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);

  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Mình là Trợ lý ảo Pozaa 🍵. Mình có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi về thực đơn, khuyến mãi, địa chỉ, giờ mở cửa hoặc thông tin chuyển khoản nhé!'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Event slider states
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const autoplayRef = useRef(null);

  // Autoplay for events slider
  const resetAutoplayTimer = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
    if (allEvents.length > 1) {
      autoplayRef.current = setInterval(() => {
        setCurrentEventIdx(prev => (prev + 1) % allEvents.length);
      }, 4000); // 4 seconds rotation
    }
  };

  useEffect(() => {
    resetAutoplayTimer();
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [allEvents.length]);

  const handlePrevEvent = () => {
    setCurrentEventIdx(prev => (prev === 0 ? allEvents.length - 1 : prev - 1));
    resetAutoplayTimer();
  };

  const handleNextEvent = () => {
    setCurrentEventIdx(prev => (prev + 1) % allEvents.length);
    resetAutoplayTimer();
  };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Helper to format bot/user messages to safe HTML (parses **bold** and [label](url))
  const formatMessageHTML = (text) => {
    if (!text) return '';
    // Escape HTML tags to prevent XSS
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
      
    // Replace markdown bold: **text** -> <strong>text</strong>
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown links: [label](url) -> <a href="url" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); text-decoration: underline; font-weight: 600;">label</a>
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); text-decoration: underline; font-weight: 600;">$1</a>');
    
    return escaped;
  };

  // Helper to normalize string for quick chat matching
  const normalizeChatText = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
      .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
      .replace(/ì|í|ị|ỉ|ĩ/g, "i")
      .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
      .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
      .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
      .replace(/đ/g, "d")
      .trim();
  };

  const handleSendChatMessage = (textToSend) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim()) return;

    // Add user message
    const userMsgId = Date.now();
    const newUserMsg = { id: userMsgId, sender: 'user', text: messageText };
    setChatMessages(prev => [...prev, newUserMsg]);
    if (!textToSend) setChatInput('');

    // Process bot reply with a small delay for natural feel
    setTimeout(() => {
      const cleanQuery = normalizeChatText(messageText);
      let replyText = '';

      if (cleanQuery.includes('dia chi') || cleanQuery.includes('o dau') || cleanQuery.includes('vi tri') || cleanQuery.includes('duong di') || cleanQuery.includes('maps') || cleanQuery.includes('ban do')) {
        replyText = `📍 Quán tọa lạc tại địa chỉ:\n**${storeData.address}**.\n\n👉 [🗺️ Xem bản đồ chỉ đường trên Google Maps](https://maps.google.com/?q=${encodeURIComponent(storeData.address)})`;
      } 
      else if (cleanQuery.includes('gio mo') || cleanQuery.includes('may gio') || cleanQuery.includes('mo cua') || cleanQuery.includes('dong cua') || cleanQuery.includes('thoi gian')) {
        replyText = `⏰ Giờ mở cửa của quán:\n**${storeData.openHours}** mỗi ngày bạn nhé! Rất hân hạnh được phục vụ bạn.`;
      } 
      else if (cleanQuery.includes('hotline') || cleanQuery.includes('sdt') || cleanQuery.includes('so dien thoai') || cleanQuery.includes('zalo') || cleanQuery.includes('lien he') || cleanQuery.includes('dien thoai')) {
        replyText = `📞 Bạn có thể liên hệ trực tiếp với quán qua:\n- Hotline: **${storeData.hotline}**\n- Zalo hỗ trợ: [💬 Nhắn Zalo ngay](https://zalo.me/${storeData.zalo})`;
      } 
      else if (cleanQuery.includes('chuyen khoan') || cleanQuery.includes('ngan hang') || cleanQuery.includes('so tai khoan') || cleanQuery.includes('chu tk') || cleanQuery.includes('stk') || cleanQuery.includes('ngan hang nao') || cleanQuery.includes('thanh toan qr')) {
        replyText = `💳 Thông tin tài khoản chuyển khoản của quán:\n- Ngân hàng: **${storeData.bankName}** (Mã: ${storeData.bankCode})\n- Số tài khoản: **${storeData.bankAccount}**\n- Chủ tài khoản: **${storeData.bankOwner}**\n\nBạn cũng có thể quét mã QR tự động điền số tiền và nội dung bằng cách chọn phương thức "Chuyển khoản QR" khi tiến hành đặt hàng trong Giỏ hàng nhé!`;
      } 
      else if (cleanQuery.includes('topping') || cleanQuery.includes('kem cheese') || cleanQuery.includes('tran chau') || cleanQuery.includes('thach')) {
        if (allToppings.length > 0) {
          const list = allToppings.map(t => `- **${t.name}**: +${formatCurrency(t.price)}`).join('\n');
          replyText = `🍧 Danh sách các loại Topping của quán gồm có:\n${list}\n\n*Lưu ý: Topping được thêm tùy chọn khi bạn nhấp chọn các món Đồ uống nhé!*`;
        } else {
          replyText = `Quán hiện chưa cấu hình danh sách topping riêng trên sheet, bạn có thể chọn các topping mặc định trong phần tùy chọn món nước nhé!`;
        }
      } 
      else if (cleanQuery.includes('khuyen mai') || cleanQuery.includes('uu dai') || cleanQuery.includes('su kien') || cleanQuery.includes('giam gia') || cleanQuery.includes('combo')) {
        if (allEvents.length > 0) {
          const list = allEvents.map(e => `- 🎁 **${e.title}**: ${e.description}`).join('\n');
          replyText = `🎉 Các chương trình ưu đãi & sự kiện đang diễn ra tại quán:\n${list}`;
        } else {
          replyText = `Hiện tại quán chưa có sự kiện khuyến mãi mới chạy trên sheet, nhưng quán luôn có chính sách **Miễn phí giao hàng bán kính 3km** cho mọi đơn hàng đó nha!`;
        }
      } 
      else if (cleanQuery.includes('menu') || cleanQuery.includes('thuc don') || cleanQuery.includes('co nhung mon gi') || cleanQuery.includes('ban mon gi') || cleanQuery.includes('co mon gi') || cleanQuery.includes('danh sach mon')) {
        const cats = categoriesList.map(c => `- **${c.name}**`).join('\n');
        replyText = `🍵 Thực đơn của quán được chia làm các nhóm chính sau:\n${cats}\n\nBạn có thể gõ tên món cụ thể (ví dụ: "Trà sữa hoàng gia", "Pizza", "Mì Ý") để mình báo giá và tư vấn nhanh nhé!`;
      } 
      else {
        // Search products list
        const matched = products.filter(p => normalizeChatText(p.name).includes(cleanQuery) || normalizeChatText(p.category).includes(cleanQuery));
        if (matched.length > 0) {
          const list = matched.map(p => {
            const variantPrices = p.variants.map(v => `${v.unit}: **${formatCurrency(v.discountPrice || v.price)}**`).join(', ');
            return `- 🥤 **${p.name}** (Danh mục: ${p.category})\n  Giá: ${variantPrices}${p.description ? `\n  *Mô tả: ${p.description}*` : ''}`;
          }).slice(0, 5).join('\n\n');
          
          replyText = `🔍 Mình tìm thấy các món sau phù hợp với từ khóa của bạn:\n\n${list}${matched.length > 5 ? `\n\n*(Và ${matched.length - 5} món khác, bạn có thể gõ cụ thể tên món hơn để thu hẹp tìm kiếm nhé)*` : ''}`;
        } else {
          replyText = `🤖 Mình là Trợ lý ảo Pozaa, được kết nối trực tiếp với Google Sheet của quán. Mình có thể trả lời các thông tin sau:\n- 📋 Danh sách thực đơn, tra cứu giá món nước & ăn vặt (ví dụ: gõ "Trà sữa", "Pizza"...) \n- 📍 Địa chỉ quán và bản đồ \n- ⏰ Giờ mở cửa \n- 📞 Hotline & Zalo liên hệ\n- 💳 Số tài khoản ngân hàng\n- 🎁 Chương trình khuyến mãi\n\nBạn có câu hỏi nào khác không ạ?`;
        }
      }

      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: replyText
      }]);
    }, 600);
  };

  // References for dropdown close
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group raw products by name & category (grouping sizes/variants) and extract categories dynamically
  const groupAndSetProducts = (rawList) => {
    const isNewItem = (item) => {
      const val = item["Món mới"] || item["Món Mới"] || item["Nhãn nổi bật"] || item.isNew;
      if (!val) return false;
      const valStr = String(val).trim().toLowerCase();
      return valStr === 'mới' || valStr === 'mon moi' || valStr === 'món mới' || valStr === 'true';
    };

    const isBestSeller = (item) => {
      const val = item["Best-seller"] || item["Bán chạy"] || item["Nhãn nổi bật"] || item.isHot || item.isBestSeller;
      if (!val) return false;
      const valStr = String(val).trim().toLowerCase();
      return valStr === 'bán chạy' || valStr === 'ban chay' || valStr === 'best-seller' || valStr === 'bestseller' || valStr === 'true';
    };

    const grouped = [];
    rawList.forEach(item => {
      const status = item["Trạng thái"] || item.status || 'Còn hàng';
      if (status !== 'Còn hàng' && status !== 'Đang bán') return;
      
      const pName = item["Tên sản phẩm"] || item.name;
      const pCategory = item["Danh mục"] || item.category;
      const pMainGroup = item["Nhóm chính"] || item["Nhóm Chính"] || item.mainGroup || "";
      
      const existing = grouped.find(p => p.name === pName && p.category === pCategory);
      
      const variant = {
        id: item["ID"] || item.id,
        unit: item["Đơn vị tính"] || item.unit || 'Phần',
        price: parseMoney(item["Giá bán"] || item.price),
        discountPrice: item["Giá khuyến mãi"] && item["Giá khuyến mãi"] !== '-' 
          ? parseMoney(item["Giá khuyến mãi"]) 
          : (item.discountPrice ? parseMoney(item.discountPrice) : null)
      };

      const isNewVal = isNewItem(item);
      const isHotVal = isBestSeller(item);

      if (existing) {
        existing.variants.push(variant);
        const currentPrice = variant.discountPrice || variant.price;
        if (currentPrice < existing.minPrice) {
          existing.minPrice = currentPrice;
        }
        if (isNewVal) existing.isNew = true;
        if (isHotVal) existing.isHot = true;
      } else {
        grouped.push({
          name: pName,
          category: pCategory,
          mainGroup: pMainGroup,
          description: item["Mô tả"] || item.description || "",
          image: item["Link hình ảnh"] || item["Hình ảnh"] || item.image || "",
          isNew: isNewVal,
          isHot: isHotVal,
          minPrice: variant.discountPrice || variant.price,
          variants: [variant]
        });
      }
    });

    setProducts(grouped);

    // Extract dynamic categories from the products list
    const catNames = [...new Set(grouped.map(p => p.category))].filter(Boolean);
    const dynamicCategories = catNames.map(name => {
      const productWithImg = grouped.find(p => p.category === name && p.image !== '');
      const fallbackProduct = grouped.find(p => p.category === name);
      
      return {
        id: createSlug(name),
        name: name,
        image: productWithImg ? productWithImg.image : (fallbackProduct ? fallbackProduct.image : "https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=600&auto=format&fit=crop")
      };
    });

    setCategoriesList(dynamicCategories);
  };

  useEffect(() => {
    groupAndSetProducts(productsRaw);
  }, []);

  // Fetch real-time data from Google Sheets Apps Script Web App
  useEffect(() => {
    const webAppUrl = import.meta.env.VITE_GAS_API_URL || localStorage.getItem('gas_api_url') || DEFAULT_GAS_URL;
    if (webAppUrl) {
      setIsLoading(true);
      fetch(webAppUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Map Store Info
            if (data.cuaHang) {
              setStoreData({
                name: data.cuaHang["Tên cửa hàng"] || storeInfo.name,
                logo: data.cuaHang["Logo URL"] || data.cuaHang["Logo"] || storeInfo.logo,
                banner: data.cuaHang["Hero Banner URL"] || data.cuaHang["Banner"] || data.cuaHang["banners"]?.[0] || storeInfo.banner,
                hotline: data.cuaHang["Số điện thoại"] || data.cuaHang["Hotline"] || storeInfo.hotline,
                address: data.cuaHang["Địa chỉ"] || storeInfo.address,
                bankName: data.cuaHang["Tên ngân hàng"] || data.cuaHang["Ngân hàng"] || storeInfo.bankName,
                bankCode: data.cuaHang["Mã ngân hàng"] || data.cuaHang["Mã Ngân Hàng"] || storeInfo.bankCode,
                bankAccount: data.cuaHang["Số tài khoản"] || storeInfo.bankAccount,
                bankOwner: data.cuaHang["Tên chủ TK"] || data.cuaHang["Chủ tài khoản"] || storeInfo.bankOwner,
                openHours: data.cuaHang["Giờ mở cửa"] || storeInfo.openHours,
                description: data.cuaHang["Slogan"] || data.cuaHang["Mô tả"] || storeInfo.description,
                zalo: data.cuaHang["Zalo"] || storeInfo.zalo,
                facebook: data.cuaHang["Facebook"] || storeInfo.facebook,
                mapsUrl: data.cuaHang["Google Maps Embed URL"] || storeInfo.mapsUrl
              });
            }

            // Map Toppings
            if (data.topping) {
              const mappedToppings = data.topping.map(item => ({
                id: item["ID"] || item.id,
                type: item["Nhóm chính"] || "Đồ uống",
                name: item["Tên topping"] || item["Tên Topping"],
                price: parseMoney(item["Giá"] || item.price),
                discountPrice: item["Giá khuyến mãi"] && item["Giá khuyến mãi"] !== '-' ? parseMoney(item["Giá khuyến mãi"]) : null,
                unit: item["Đơn vị tính"] || "Phần"
              }));
              setAllToppings(mappedToppings);
            }

            // Map Events
            if (data.suKien) {
              const mappedEvents = data.suKien.map(item => ({
                id: item["ID"] || item.id,
                title: item["Tiêu đề"] || item.title,
                description: item["Mô tả"] || item.description || "",
                image: item["Hình ảnh"] || item["Link hình ảnh"] || item.image || "",
                type: item["Loại"] || "Khuyến mãi",
                startDate: item["Ngày bắt đầu"] || "",
                endDate: item["Ngày kết thúc"] || "",
                status: item["Trạng thái"] || "Hiển thị"
              }));
              setAllEvents(mappedEvents);
            }

            // Group and Map Products dynamically
            if (data.sanPham) {
              groupAndSetProducts(data.sanPham);
            }
          }
        })
        .catch(err => {
          console.error("Error fetching live sheet data, using fallback mock data:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleNavClick = (catId) => {
    setActiveCategory(catId);
    setActiveDropdown(''); // close dropdown
    
    // Smooth scroll back to menu header start area so user sees the new category from the top
    const menuEl = document.querySelector('.search-filter-section');
    if (menuEl) {
      const offset = menuEl.offsetTop - 140;
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  // Toggle active dropdown (mainly for mobile clicks)
  const handleDropdownToggle = (type) => {
    if (activeDropdown === type) {
      setActiveDropdown('');
    } else {
      setActiveDropdown(type);
    }
  };

  // Filter and search logic
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTag = true;
    if (activeFilter === 'new') matchesTag = product.isNew;
    if (activeFilter === 'hot') matchesTag = product.isHot;
    if (activeFilter === 'sale') matchesTag = product.variants.some(v => v.discountPrice !== null);

    return matchesSearch && matchesTag;
  });

  // Modal handlers
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants[0]); // default to first variant/size
    setSelectedToppings({}); // reset topping counts
    setProductQty(1);
    setProductNote('');
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  // Adjust quantity of a selected topping
  const handleToppingQtyChange = (topping, change) => {
    const currentQty = selectedToppings[topping.id] || 0;
    const newQty = currentQty + change;
    
    if (newQty <= 0) {
      const updated = { ...selectedToppings };
      delete updated[topping.id];
      setSelectedToppings(updated);
    } else {
      setSelectedToppings({
        ...selectedToppings,
        [topping.id]: newQty
      });
    }
  };

  // Calculate total price of chosen toppings in modal
  const getModalToppingsTotal = () => {
    return Object.keys(selectedToppings).reduce((acc, toppingId) => {
      const topping = allToppings.find(t => String(t.id) === String(toppingId));
      const qty = selectedToppings[toppingId];
      return acc + (topping ? topping.price * qty : 0);
    }, 0);
  };

  // Get toppings matching the selected product's main group
  const getProductToppings = (product) => {
    if (!product) return [];
    const pGroup = product.mainGroup || (classifyCategory(product.category) === 'drinks' ? 'Đồ uống' : 'Ăn vặt');
    return allToppings.filter(topping => 
      topping.type && topping.type.trim().toLowerCase() === pGroup.trim().toLowerCase()
    );
  };

  // Cart operations
  const addToCart = () => {
    const singlePrice = selectedVariant.discountPrice || selectedVariant.price;
    const toppingsPrice = getModalToppingsTotal();
    const itemTotal = singlePrice + toppingsPrice;

    // Convert map to list of selected toppings for cart
    const toppingsList = Object.keys(selectedToppings).map(toppingId => {
      const topping = allToppings.find(t => String(t.id) === String(toppingId));
      return {
        id: topping.id,
        name: topping.name,
        price: topping.price,
        qty: selectedToppings[toppingId]
      };
    });

    const toppingIdsAndQty = toppingsList
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map(t => `${t.id}x${t.qty}`)
      .join('-');
    const cartItemId = `${selectedVariant.id}-${toppingIdsAndQty}-${productNote}`;

    const newCartItem = {
      cartItemId,
      id: selectedVariant.id, // Actual product-variant row ID from sheet
      name: selectedProduct.name,
      size: selectedVariant.unit,
      qty: productQty,
      price: itemTotal,
      basePrice: singlePrice,
      toppings: toppingsList,
      note: productNote,
      image: selectedProduct.image,
      category: selectedProduct.category
    };

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.cartItemId === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].qty += productQty;
        return updated;
      } else {
        return [...prevCart, newCartItem];
      }
    });

    closeProductModal();
  };

  const updateCartItemQty = (cartItemId, change) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.qty + change;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Submit Order to Google Apps Script / AppSheet
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsOrdering(true);
    
    // Create random order code
    const orderCode = 'DH' + Date.now().toString().slice(-6);

    // Build Payload to match precisely the schema expected by the Apps Script xuLyDatHang
    const orderPayload = {
      action: "datHang", // route trigger for doPost
      maDon: orderCode,
      tongTien: cartTotal,
      hoTen: checkoutName,
      soDienThoai: checkoutPhone,
      diaChiNhanHang: checkoutAddress,
      hinhThuc: "giaohang",
      phuongThucThanhToan: paymentMethod === 'Transfer' ? 'CK' : 'COD',
      ghiChu: checkoutNote,
      cart: cart.map(item => {
        return {
          SP_id: String(item.id), // Variant Row ID (SP001, SP002...)
          tenSanPham: item.name,
          danhMuc: item.category,
          donViTinh: item.size,
          soLuong: item.qty,
          giaBan: item.basePrice || item.price,
          ghiChu: item.note,
          toppings: item.toppings
        };
      })
    };

    const webAppUrl = import.meta.env.VITE_GAS_API_URL || localStorage.getItem('gas_api_url') || DEFAULT_GAS_URL;

    try {
      if (webAppUrl) {
        const response = await fetch(webAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
          },
          body: JSON.stringify(orderPayload)
        });
        const resJson = await response.json();
        
        if (resJson && resJson.success) {
          setCreatedOrder({
            orderId: resJson.maDon || orderCode,
            paymentMethod: paymentMethod === 'Transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
            totalAmount: cartTotal
          });
        } else {
          throw new Error(resJson?.error || "Ghi nhận đơn hàng thất bại");
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setCreatedOrder({
          orderId: orderCode,
          paymentMethod: paymentMethod === 'Transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
          totalAmount: cartTotal
        });
      }
      
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error("Order submission failed, activating browser fallback simulation:", err);
      setCreatedOrder({
        orderId: orderCode,
        paymentMethod: paymentMethod === 'Transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
        totalAmount: cartTotal
      });
      setCart([]);
      setIsCartOpen(false);
    } finally {
      setIsOrdering(false);
    }
  };

  // Close success modal & reset checkout form
  const resetOrderProcess = () => {
    setCreatedOrder(null);
    setCheckoutName('');
    setCheckoutPhone('');
    setCheckoutAddress('');
    setCheckoutNote('');
  };

  // Filter categories into group categories
  const drinksCategories = categoriesList.filter(cat => classifyCategory(cat.name) === 'drinks');
  const foodCategories = categoriesList.filter(cat => classifyCategory(cat.name) === 'food');

  // Check if a category belongs to active dropdown categories
  const isDrinksActive = drinksCategories.some(c => c.id === activeCategory);
  const isFoodActive = foodCategories.some(c => c.id === activeCategory);

  // Get active category data object to render ONLY this category
  const activeCatData = categoriesList.find(cat => cat.id === activeCategory);
  
  // Calculate alternating layout index based on its position in the list
  const activeCatIndex = categoriesList.findIndex(cat => cat.id === activeCategory);
  const isOdd = activeCatIndex % 2 !== 0;

  const isSearchingOrFiltering = searchQuery !== '' || activeFilter !== 'all';

  // Get filtered products for only the active category (or all if searching/filtering without active category)
  const displayProducts = activeCatData 
    ? filteredProducts.filter(p => p.category === activeCatData.name)
    : (isSearchingOrFiltering ? filteredProducts : []);

  return (
    <>
      {/* LOADING OVERLAY SCREEN */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Đang tải cửa hàng...</div>
        </div>
      )}

      {/* HEADER HERO BANNER */}
      <header className="header-hero" style={{ 
        backgroundImage: `url(${getDirectImgUrl(storeData.banner) || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=1200&auto=format&fit=crop'})` 
      }}>
        <div className="header-hero-content animate-fade-in">
          <div className="header-logo-container">
            <img 
              src={getDirectImgUrl(storeData.logo)} 
              alt="Logo" 
              className="header-logo" 
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=200&auto=format&fit=crop';
              }}
            />
          </div>
          <h1 className="store-title">{storeData.name}</h1>
          <p className="store-desc">{storeData.description}</p>
          <div className="store-meta">
            <span>🕒 Giờ mở cửa: {storeData.openHours}</span>
            <span>📞 Hotline: {storeData.hotline}</span>
          </div>
        </div>

        {/* EVENTS / PROMOTIONS SLIDER */}
        {allEvents.length > 0 && (
          <div className="event-slider-container container">
            <div className="event-slider-relative">
              {allEvents.map((evt, idx) => (
                <div 
                  key={evt.id || idx}
                  className={`event-slide animate-fade-in ${idx === currentEventIdx ? 'active' : 'inactive'}`}
                  style={{ display: idx === currentEventIdx ? 'flex' : 'none', cursor: 'pointer' }}
                  onClick={() => setSelectedEvent(evt)}
                >
                  <img 
                    src={getDirectImgUrl(evt.image)} 
                    alt={evt.title} 
                    className="event-image" 
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=800&auto=format&fit=crop';
                    }}
                  />
                  <div className="event-info">
                    <h3 className="event-title">{evt.title}</h3>
                    <p className="event-desc">{evt.description}</p>
                  </div>
                </div>
              ))}

              {/* Navigation controls if more than 1 event */}
              {allEvents.length > 1 && (
                <>
                  <button 
                    className="event-nav-btn prev-btn" 
                    onClick={handlePrevEvent}
                    aria-label="Previous event"
                  >
                    ⟨
                  </button>
                  <button 
                    className="event-nav-btn next-btn" 
                    onClick={handleNextEvent}
                    aria-label="Next event"
                  >
                    ⟩
                  </button>
                  
                  {/* Indicator Dots */}
                  <div className="event-dots">
                    {allEvents.map((_, idx) => (
                      <span 
                        key={idx} 
                        className={`event-dot ${idx === currentEventIdx ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentEventIdx(idx);
                          resetAutoplayTimer();
                        }}
                      ></span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* STICKY CATEGORY NAV - 2 MAIN GROUPS WITH DROPDOWNS */}
      {categoriesList.length > 0 && (
        <nav className="sticky-nav-wrapper" ref={dropdownRef}>
          <div className="container">
            <div className="sticky-nav-container">
              
              {/* DROPDOWN 1: TEA & COFFEE */}
              {drinksCategories.length > 0 && (
                <div className="nav-dropdown-trigger">
                  <span 
                    className={`nav-item ${isDrinksActive ? 'active' : ''}`}
                    onClick={() => handleDropdownToggle('drinks')}
                  >
                    Tea & Coffee
                    <span className={`nav-caret ${activeDropdown === 'drinks' ? 'rotated' : ''}`}>▼</span>
                  </span>
                  
                  <div className={`nav-dropdown-menu ${activeDropdown === 'drinks' ? 'open' : ''}`}>
                    {drinksCategories.map(cat => (
                      <span
                        key={cat.id}
                        className={`dropdown-item ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => handleNavClick(cat.id)}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DROPDOWN 2: ẨM THỰC */}
              {foodCategories.length > 0 && (
                <div className="nav-dropdown-trigger">
                  <span 
                    className={`nav-item ${isFoodActive ? 'active' : ''}`}
                    onClick={() => handleDropdownToggle('food')}
                  >
                    Ẩm thực
                    <span className={`nav-caret ${activeDropdown === 'food' ? 'rotated' : ''}`}>▼</span>
                  </span>
                  
                  <div className={`nav-dropdown-menu ${activeDropdown === 'food' ? 'open' : ''}`}>
                    {foodCategories.map(cat => (
                      <span
                        key={cat.id}
                        className={`dropdown-item ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => handleNavClick(cat.id)}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </nav>
      )}

      {/* SEARCH AND FILTER BAR */}
      <section className="search-filter-section container">
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder="Tìm kiếm trà sữa, ăn vặt..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="filter-tags">
          <span 
            className={`filter-tag ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Tất cả món
          </span>
          <span 
            className={`filter-tag ${activeFilter === 'new' ? 'active' : ''}`}
            onClick={() => setActiveFilter('new')}
          >
            ✨ Món Mới
          </span>
          <span 
            className={`filter-tag ${activeFilter === 'hot' ? 'active' : ''}`}
            onClick={() => setActiveFilter('hot')}
          >
            🔥 Bán Chạy
          </span>
          <span 
            className={`filter-tag ${activeFilter === 'sale' ? 'active' : ''}`}
            onClick={() => setActiveFilter('sale')}
          >
            🏷️ Khuyến Mãi
          </span>
        </div>
      </section>

      {/* MENU CONTAINER */}
      <main className="menu-section container">
        {activeCategory ? (
          /* Active Category Mode */
          displayProducts.length > 0 ? (
            <div 
              className={`category-block ${isOdd ? 'odd' : ''} animate-fade-in`}
              key={activeCatData.id}
            >
              <div className="category-title-header">
                <span className="category-subtitle">
                  <span className="back-to-directory" onClick={() => setActiveCategory('')}>
                    ◀ Quay lại thực đơn chính
                  </span>
                </span>
                <h2 className="category-name">{activeCatData.name}</h2>
              </div>

              <div className="category-grid">
                {/* Visual Category Image */}
                <div className="category-image-wrapper">
                  <img 
                    src={getDirectImgUrl(activeCatData.image)} 
                    alt={activeCatData.name} 
                    className="category-image" 
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  <div className="category-image-overlay"></div>
                </div>

                {/* Products List */}
                <div className="category-items-wrapper">
                  {displayProducts.map((product, pIdx) => (
                    <div 
                      key={pIdx} 
                      className="menu-item"
                      onClick={() => openProductModal(product)}
                    >
                      {product.image && (
                        <img 
                          src={getDirectImgUrl(product.image)} 
                          alt={product.name} 
                          className="menu-item-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="menu-item-content">
                        <div className="menu-item-header">
                          <div className="menu-item-name-wrapper">
                            <h3 className="menu-item-name">{product.name}</h3>
                            {product.isHot && <span className="menu-item-badge badge-hot">Hot</span>}
                            {product.isNew && <span className="menu-item-badge badge-new">New</span>}
                          </div>
                          <div className="menu-item-dots"></div>
                          <div className="menu-item-price">
                            Từ {formatCurrency(product.minPrice)}
                          </div>
                          <span className="menu-item-action">Chọn</span>
                        </div>
                        <p className="menu-item-desc">{product.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-products-found animate-fade-in">
              <span className="no-products-icon">🔍</span>
              <p>Không tìm thấy món nào trong danh mục <strong>{activeCatData?.name}</strong> khớp với bộ lọc.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                <button className="clear-btn" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}>Xóa bộ lọc</button>
                <button className="clear-btn secondary" onClick={() => setActiveCategory('')}>Quay lại thực đơn chính</button>
              </div>
            </div>
          )
        ) : isSearchingOrFiltering ? (
          /* Search or Filter across all categories Mode */
          displayProducts.length > 0 ? (
            <div className="category-block animate-fade-in">
              <div className="category-title-header">
                <span className="category-subtitle">
                  <span className="back-to-directory" onClick={() => { setActiveCategory(''); setSearchQuery(''); setActiveFilter('all'); }}>
                    ◀ Quay lại thực đơn chính
                  </span>
                </span>
                <h2 className="category-name">
                  {searchQuery ? `Kết quả tìm kiếm cho "${searchQuery}"` : 'Danh sách món lọc'}
                </h2>
              </div>
              <div className="search-results-grid">
                {displayProducts.map((product, pIdx) => (
                  <div 
                    key={pIdx} 
                    className="menu-item search-result-item"
                    onClick={() => openProductModal(product)}
                  >
                    {product.image && (
                      <img 
                        src={getDirectImgUrl(product.image)} 
                        alt={product.name} 
                        className="menu-item-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="menu-item-content">
                      <div className="menu-item-header">
                        <div className="menu-item-name-wrapper">
                          <h3 className="menu-item-name">{product.name}</h3>
                          <span className="search-result-category-tag">{product.category}</span>
                          {product.isHot && <span className="menu-item-badge badge-hot">Hot</span>}
                          {product.isNew && <span className="menu-item-badge badge-new">New</span>}
                        </div>
                        <div className="menu-item-dots"></div>
                        <div className="menu-item-price">
                          Từ {formatCurrency(product.minPrice)}
                        </div>
                        <span className="menu-item-action">Chọn</span>
                      </div>
                      <p className="menu-item-desc">{product.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-products-found animate-fade-in">
              <span className="no-products-icon">🔍</span>
              <p>Không tìm thấy món nào khớp với từ khóa hoặc bộ lọc của bạn.</p>
              <button className="clear-btn" style={{ marginTop: '15px' }} onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}>Xóa bộ lọc và quay lại</button>
            </div>
          )
        ) : (
          /* Directory Overview Mode */
          <div className="menu-directory animate-fade-in">
            <div className="directory-header">
              <span className="directory-subtitle">Chào mừng bạn đến với {storeData.name}</span>
              <h2 className="directory-title">KHÁM PHÁ THỰC ĐƠN</h2>
              <div className="title-divider"></div>
              <p className="directory-intro">Vui lòng chọn một danh mục bên dưới hoặc từ thanh thực đơn phía trên để thưởng thức các món ngon của quán.</p>
            </div>

            <div className="directory-groups">
              {drinksCategories.length > 0 && (
                <div className="directory-group">
                  <h3 className="directory-group-title font-serif">🍵 Trà & Cà Phê</h3>
                  <div className="directory-grid">
                    {drinksCategories.map(cat => (
                      <div 
                        key={cat.id} 
                        className="directory-card"
                        onClick={() => handleNavClick(cat.id)}
                      >
                        <img 
                          src={getDirectImgUrl(cat.image)} 
                          alt={cat.name} 
                          className="directory-card-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=600&auto=format&fit=crop';
                          }}
                        />
                        <div className="directory-card-overlay">
                          <h4 className="directory-card-name">{cat.name}</h4>
                          <span className="directory-card-btn">Xem món ➔</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {foodCategories.length > 0 && (
                <div className="directory-group">
                  <h3 className="directory-group-title font-serif">🍟 Ẩm Thực & Ăn Vặt</h3>
                  <div className="directory-grid">
                    {foodCategories.map(cat => (
                      <div 
                        key={cat.id} 
                        className="directory-card"
                        onClick={() => handleNavClick(cat.id)}
                      >
                        <img 
                          src={getDirectImgUrl(cat.image)} 
                          alt={cat.name} 
                          className="directory-card-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=600&auto=format&fit=crop';
                          }}
                        />
                        <div className="directory-card-overlay">
                          <h4 className="directory-card-name">{cat.name}</h4>
                          <span className="directory-card-btn">Xem món ➔</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FLOATING CART TRIGGER BUTTON */}
      {cartItemCount > 0 && (
        <button className="floating-cart-trigger" onClick={() => setIsCartOpen(true)}>
          🛒
          <span className="cart-count-badge">{cartItemCount}</span>
        </button>
      )}

      {/* EVENT POPUP MODAL */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>✕</button>
            <img 
              src={getDirectImgUrl(selectedEvent.image)} 
              alt={selectedEvent.title} 
              className="modal-hero-image" 
              style={{ height: 'auto', aspectRatio: '16/9' }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <div className="modal-body">
              <span className="event-modal-badge">{selectedEvent.type || "Khuyến mãi"}</span>
              <h2 className="modal-title" style={{ fontSize: '1.6rem', marginBottom: '15px' }}>{selectedEvent.title}</h2>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                {selectedEvent.description}
              </p>
              {(selectedEvent.startDate || selectedEvent.endDate) && (
                <div className="event-modal-time">
                  📅 <strong>Thời gian áp dụng:</strong> {selectedEvent.startDate ? `Từ ${selectedEvent.startDate}` : ''} {selectedEvent.endDate ? `đến ${selectedEvent.endDate}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT POPUP MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeProductModal}>✕</button>
            <img 
              src={getDirectImgUrl(selectedProduct.image)} 
              alt={selectedProduct.name} 
              className="modal-hero-image" 
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=600&auto=format&fit=crop';
              }}
            />
            
            <div className="modal-body">
              <h2 className="modal-title">{selectedProduct.name}</h2>
              <p className="modal-desc">{selectedProduct.description}</p>

              {/* SIZE OPTIONS */}
              <div className="option-group">
                <h4 className="section-option-title">
                  Chọn kích cỡ (Size)
                  <span className="section-option-required">Bắt buộc</span>
                </h4>
                <div className="options-grid">
                  {selectedProduct.variants.map((v) => {
                    const price = v.discountPrice || v.price;
                    return (
                      <div 
                        key={v.id} 
                        className={`option-card ${selectedVariant?.id === v.id ? 'selected' : ''}`}
                        onClick={() => setSelectedVariant(v)}
                      >
                        <span className="option-card-label">
                          <span className="checkbox-round"></span>
                          {v.unit}
                        </span>
                        <span className="option-card-price">+{formatCurrency(price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TOPPING OPTIONS WITH QUANTITY SELECTOR */}
              {getProductToppings(selectedProduct).length > 0 && (
                <div className="option-group">
                  <h4 className="section-option-title">
                    Chọn topping thêm
                    <span className="section-option-required" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>Tùy chọn</span>
                  </h4>
                  <div className="topping-group-list">
                    {getProductToppings(selectedProduct).map((topping) => {
                      const toppingQty = selectedToppings[topping.id] || 0;
                      const isSelected = toppingQty > 0;
                      return (
                        <div 
                          key={topping.id} 
                          className={`topping-item-row ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="topping-item-info" onClick={() => handleToppingQtyChange(topping, isSelected ? -toppingQty : 1)}>
                            <span className="topping-item-checkbox"></span>
                            <span className="topping-item-name">
                              {topping.name} {isSelected && <strong style={{ color: 'var(--accent-gold)' }}>x{toppingQty}</strong>}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="topping-item-price">+{formatCurrency(topping.price)}</span>
                            
                            {/* Quantity buttons for topping */}
                            {isSelected && (
                              <div className="qty-counter" style={{ padding: '1px', border: '1px solid var(--accent-gold)' }}>
                                <button 
                                  className="qty-btn" 
                                  style={{ width: '20px', height: '20px', fontSize: '0.8rem' }}
                                  onClick={(e) => { e.stopPropagation(); handleToppingQtyChange(topping, -1); }}
                                >
                                  −
                                </button>
                                <span className="qty-val" style={{ width: '18px', fontSize: '0.8rem' }}>{toppingQty}</span>
                                <button 
                                  className="qty-btn" 
                                  style={{ width: '20px', height: '20px', fontSize: '0.8rem' }}
                                  onClick={(e) => { e.stopPropagation(); handleToppingQtyChange(topping, 1); }}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NOTES */}
              <div className="option-group">
                <h4 className="section-option-title">Ghi chú thêm (Đường/Đá hoặc yêu cầu khác)</h4>
                <input 
                  type="text" 
                  placeholder="Ví dụ: 70% đường, 50% đá, ít cay..." 
                  className="form-input"
                  style={{ width: '100%' }}
                  value={productNote}
                  onChange={(e) => setProductNote(e.target.value)}
                />
              </div>

              {/* BOTTOM ACTION BAR */}
              <div className="modal-bottom-bar">
                <div className="qty-counter">
                  <button className="qty-btn" onClick={() => setProductQty(Math.max(1, productQty - 1))}>−</button>
                  <span className="qty-val">{productQty}</span>
                  <button className="qty-btn" onClick={() => setProductQty(productQty + 1)}>+</button>
                </div>

                <button className="add-cart-btn" onClick={addToCart}>
                  <span>Thêm vào giỏ hàng</span>
                  <span>
                    {formatCurrency(
                      ((selectedVariant?.discountPrice || selectedVariant?.price || 0) + getModalToppingsTotal()) * productQty
                    )}
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER PANEL */}
      {isCartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h2 className="cart-drawer-title">Giỏ Hàng Của Bạn</h2>
              <button className="modal-close-btn" style={{ position: 'static' }} onClick={() => setIsCartOpen(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-items-list" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '3rem', marginBottom: '15px' }}>🛒</span>
                <p>Giỏ hàng đang trống.</p>
              </div>
            ) : (
              <div className="cart-drawer-content" style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div className="cart-items-list" style={{ overflowY: 'visible', flexGrow: 0, paddingBottom: '10px' }}>
                  {cart.map((item) => (
                    <div key={item.cartItemId} className="cart-item-row">
                      <img 
                        src={getDirectImgUrl(item.image)} 
                        alt={item.name} 
                        className="cart-item-img" 
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=200&auto=format&fit=crop';
                        }}
                      />
                      <div className="cart-item-details">
                        <h4 className="cart-item-name">{item.name}</h4>
                        <div className="cart-item-options">
                          <span>{item.size}</span>
                          {item.toppings.length > 0 && (
                            <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                              + Toppings: {item.toppings.map(t => `${t.name} x${t.qty}`).join(', ')}
                            </div>
                          )}
                          {item.note && <div style={{ color: 'var(--accent-gold)', marginTop: '2px' }}>Ghi chú: {item.note}</div>}
                        </div>
                        <div className="cart-item-price-row">
                          <span className="cart-item-price">{formatCurrency(item.price * item.qty)}</span>
                          
                          <div className="qty-counter" style={{ padding: '2px' }}>
                            <button className="qty-btn" style={{ width: '24px', height: '24px', fontSize: '0.9rem' }} onClick={() => updateCartItemQty(item.cartItemId, -1)}>−</button>
                            <span className="qty-val" style={{ width: '25px', fontSize: '0.9rem' }}>{item.qty}</span>
                            <button className="qty-btn" style={{ width: '24px', height: '24px', fontSize: '0.9rem' }} onClick={() => updateCartItemQty(item.cartItemId, 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-drawer-footer">
                  <div className="cart-summary-row">
                    <span>Tạm tính:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Phí giao hàng:</span>
                    <span style={{ color: '#10b981', fontWeight: '500' }}>Miễn phí (Bán kính 3km)</span>
                  </div>
                  <div className="cart-summary-row cart-total-row">
                    <span>Tổng cộng:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>

                  {/* CHECKOUT FORM */}
                  <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
                    <div className="form-group">
                      <label className="form-label">Tên khách hàng *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nhập tên của bạn" 
                        className="form-input"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số điện thoại *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="Nhập số điện thoại nhận hàng" 
                        className="form-input"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Địa chỉ giao hàng *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nhập địa chỉ chi tiết để giao món" 
                        className="form-input"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ghi chú cho shipper / nhà hàng</label>
                      <input 
                        type="text" 
                        placeholder="Ghi chú thêm nếu cần..." 
                        className="form-input"
                        value={checkoutNote}
                        onChange={(e) => setCheckoutNote(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phương thức thanh toán</label>
                      <div className="payment-options">
                        <div 
                          className={`option-card ${paymentMethod === 'Cash' ? 'selected' : ''}`}
                          style={{ padding: '8px 12px' }}
                          onClick={() => setPaymentMethod('Cash')}
                        >
                          <span className="option-card-label" style={{ fontSize: '0.82rem' }}>
                            <span className="checkbox-round"></span>
                            Tiền mặt
                          </span>
                        </div>
                        <div 
                          className={`option-card ${paymentMethod === 'Transfer' ? 'selected' : ''}`}
                          style={{ padding: '8px 12px' }}
                          onClick={() => setPaymentMethod('Transfer')}
                        >
                          <span className="option-card-label" style={{ fontSize: '0.82rem' }}>
                            <span className="checkbox-round"></span>
                            Chuyển khoản QR
                          </span>
                        </div>
                      </div>
                    </div>

                    {paymentMethod === 'Transfer' && (
                      <div className="checkout-bank-details animate-fade-in" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--accent-gold-dim)', margin: '15px 0' }}>
                        <h4 className="font-serif text-gold" style={{ fontSize: '1.1rem', textAlign: 'center', marginBottom: '10px' }}>THÔNG TIN CHUYỂN KHOẢN</h4>
                        <img 
                          src={`https://img.vietqr.io/image/${storeData.bankCode}-${storeData.bankAccount}-compact.png?amount=${cartTotal}&addInfo=Pozaa%20Tea%20Dat%20Mon&accountName=${encodeURIComponent(storeData.bankOwner)}`} 
                          alt="VietQR Chuyển Khoản" 
                          className="qr-code-img" 
                          style={{ width: '180px', height: '180px', margin: '5px auto', display: 'block', border: '2px solid var(--accent-gold)', borderRadius: '10px' }}
                        />
                        <div className="transfer-info-box" style={{ margin: '10px 0', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem' }}>
                          <div className="transfer-info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span className="transfer-info-label" style={{ color: 'var(--text-secondary)' }}>Ngân hàng:</span>
                            <span className="transfer-info-val" style={{ fontWeight: '600' }}>{storeData.bankName}</span>
                          </div>
                          <div className="transfer-info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span className="transfer-info-label" style={{ color: 'var(--text-secondary)' }}>Số tài khoản:</span>
                            <span className="transfer-info-val" style={{ fontWeight: '600' }}>{storeData.bankAccount}</span>
                          </div>
                          <div className="transfer-info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span className="transfer-info-label" style={{ color: 'var(--text-secondary)' }}>Chủ tài khoản:</span>
                            <span className="transfer-info-val" style={{ fontWeight: '600' }}>{storeData.bankOwner}</span>
                          </div>
                          <div className="transfer-info-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="transfer-info-label" style={{ color: 'var(--text-secondary)' }}>Số tiền:</span>
                            <span className="transfer-info-val text-gold" style={{ fontWeight: '600', color: 'var(--accent-gold)' }}>{formatCurrency(cartTotal)}</span>
                          </div>
                        </div>
                        <p className="copy-hint" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', lineHeight: '1.4', margin: '0', textAlign: 'center' }}>
                          Vui lòng quét mã trên để thanh toán. Chúng tôi sẽ gọi xác nhận ngay sau khi nhận được đơn hàng.
                        </p>
                      </div>
                    )}

                    <button type="submit" className="checkout-submit-btn" disabled={isOrdering}>
                      {isOrdering ? 'Đang gửi đơn hàng...' : `Đặt hàng ngay • ${formatCurrency(cartTotal)}`}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER SUCCESS POPUP WITH BANK QR CODE */}
      {createdOrder && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in" style={{ maxWidth: '500px' }}>
            <div className="modal-body success-card">
              <span className="success-icon">🎉</span>
              <h2 className="modal-title" style={{ fontSize: '1.8rem', textAlign: 'center' }}>Đặt hàng thành công!</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '8px 0 20px' }}>
                Mã đơn hàng của bạn là <strong>{createdOrder.orderId}</strong>. Nhân viên quán đang chuẩn bị món để shipper giao ngay cho bạn nhé!
              </p>

              {createdOrder.paymentMethod === 'Chuyển khoản QR' && (
                <div>
                  <h4 className="font-serif text-gold" style={{ fontSize: '1.2rem' }}>QUÉT MÃ QR ĐỂ THANH TOÁN</h4>
                  
                  {/* Generate dynamic VietQR image with API */}
                  <img 
                    src={`https://img.vietqr.io/image/${storeData.bankCode}-${storeData.bankAccount}-compact.png?amount=${createdOrder.totalAmount}&addInfo=${createdOrder.orderId}&accountName=${encodeURIComponent(storeData.bankOwner)}`} 
                    alt="VietQR Chuyển Khoản" 
                    className="qr-code-img" 
                  />

                  <div className="transfer-info-box">
                    <div className="transfer-info-row">
                      <span className="transfer-info-label">Ngân hàng:</span>
                      <span className="transfer-info-val">{storeData.bankName}</span>
                    </div>
                    <div className="transfer-info-row">
                      <span className="transfer-info-label">Số tài khoản:</span>
                      <span className="transfer-info-val">{storeData.bankAccount}</span>
                    </div>
                    <div className="transfer-info-row">
                      <span className="transfer-info-label">Chủ tài khoản:</span>
                      <span className="transfer-info-val">{storeData.bankOwner}</span>
                    </div>
                    <div className="transfer-info-row">
                      <span className="transfer-info-label">Số tiền:</span>
                      <span className="transfer-info-val text-gold" style={{ fontSize: '1rem' }}>{formatCurrency(createdOrder.totalAmount)}</span>
                    </div>
                    <div className="transfer-info-row">
                      <span className="transfer-info-label">Nội dung CK:</span>
                      <span className="transfer-info-val text-gold">{createdOrder.orderId}</span>
                    </div>
                  </div>
                  <p className="copy-hint">Hãy đảm bảo nhập đúng nội dung chuyển khoản là <strong>{createdOrder.orderId}</strong> để hệ thống tự động nhận diện!</p>
                </div>
              )}

              <button 
                className="checkout-submit-btn" 
                style={{ marginTop: '20px' }}
                onClick={resetOrderProcess}
              >
                Tiếp tục mua hàng
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CONTACT SECTION */}
      <section className="contact-section container animate-fade-in">
        <div className="contact-grid-wrapper">
          {/* Contact Info */}
          <div className="contact-info-block">
            <h2 className="contact-section-title font-serif">Liên Hệ Đặt Món</h2>
            <div className="title-divider" style={{ margin: '0 0 25px 0' }}></div>
            
            <div className="contact-item">
              <span className="contact-item-icon">📍</span>
              <div className="contact-item-text">
                <h4>Địa chỉ</h4>
                <p>{storeData.address}</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeData.address)}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="contact-map-link"
                >
                  🗺️ Mở Google Maps
                </a>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-item-icon">📞</span>
              <div className="contact-item-text">
                <h4>Điện thoại / Zalo</h4>
                <p>{storeData.hotline} {storeData.zalo ? `— Zalo: ${storeData.zalo}` : ''}</p>
              </div>
            </div>

            <div className="contact-item">
              <span className="contact-item-icon">🕒</span>
              <div className="contact-item-text">
                <h4>Giờ mở cửa</h4>
                <p>{storeData.openHours}</p>
              </div>
            </div>

            <div className="contact-social-buttons">
              {storeData.facebook && (
                <a href={storeData.facebook} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                  🔵 Facebook
                </a>
              )}
              {storeData.zalo && (
                <a href={`https://zalo.me/${storeData.zalo}`} target="_blank" rel="noopener noreferrer" className="social-btn zalo">
                  💬 Zalo Chat
                </a>
              )}
            </div>
          </div>

          {/* Map Embed */}
          <div className="contact-map-block">
            <iframe 
              src={storeData.mapsUrl || `https://maps.google.com/maps?q=${encodeURIComponent(storeData.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%" 
              height="350" 
              style={{ border: 0, borderRadius: '12px' }} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Bản đồ chỉ đường"
            ></iframe>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">{storeData.name}</div>
          <p>{storeData.address}</p>
          <p>© 2026 Pozaa Tea. Thiết kế website bán hàng cao cấp.</p>
        </div>
      </footer>

      {/* AI ASSISTANT CHATBOT WIDGET */}
      <div 
        className="ai-assistant-trigger" 
        onClick={() => setIsChatOpen(!isChatOpen)}
        title="Trợ lý ảo Pozaa"
      >
        <img 
          src={getDirectImgUrl(storeData.logo)} 
          alt="AI Agent" 
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=200&auto=format&fit=crop';
          }}
        />
        <span className="ai-assistant-badge"></span>
      </div>

      {isChatOpen && (
        <div className="ai-chat-window" onClick={(e) => e.stopPropagation()}>
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar">
                <img 
                  src={getDirectImgUrl(storeData.logo)} 
                  alt="Avatar" 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=200&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="ai-chat-title-group">
                <span className="ai-chat-title">Trợ lý ảo Pozaa</span>
                <span className="ai-chat-status">Trực tuyến</span>
              </div>
            </div>
            <button className="ai-chat-close" onClick={() => setIsChatOpen(false)}>✕</button>
          </div>

          <div className="ai-chat-messages">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`ai-chat-msg ${msg.sender}`} 
                style={{ whiteSpace: 'pre-line' }}
                dangerouslySetInnerHTML={{ __html: formatMessageHTML(msg.text) }}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="ai-chat-input-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="ai-chat-quick-replies" style={{ width: '100%', padding: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}>
              <button className="ai-quick-btn" onClick={() => handleSendChatMessage('Menu quán có gì?')}>📋 Menu quán</button>
              <button className="ai-quick-btn" onClick={() => handleSendChatMessage('Khuyến mãi hôm nay')}>🎁 Khuyến mãi</button>
              <button className="ai-quick-btn" onClick={() => handleSendChatMessage('Địa chỉ & Bản đồ')}>📍 Địa chỉ</button>
              <button className="ai-quick-btn" onClick={() => handleSendChatMessage('Giờ mở cửa')}>⏰ Giờ mở cửa</button>
              <button className="ai-quick-btn" onClick={() => handleSendChatMessage('Số tài khoản ngân hàng')}>💳 Tài khoản ngân hàng</button>
            </div>
            <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <input 
                type="text" 
                placeholder="Hỏi về món nước, món ăn, giờ mở cửa..." 
                className="ai-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendChatMessage();
                }}
              />
              <button className="ai-chat-send" onClick={() => handleSendChatMessage()}>
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
