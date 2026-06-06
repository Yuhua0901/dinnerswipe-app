import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const FOOD_EMOJIS: Record<string, string> = {
  '魯肉飯': '🍚', '雞肉飯': '🍚', '爌肉飯': '🍚', '燒肉飯': '🍱', '排骨飯': '🍱', '肉燥飯': '🍚', '飯糰': '🍙', 
  '炒飯': '🍚', '燴飯': '🍛', '飯': '🍚', '牛肉麵': '🍜', '擔仔麵': '🍜', '拉麵': '🍜', '意麵': '🍜', '乾麵': '🍜', '涼麵': '🍜', 
  '烏龍麵': '🍜', '麵線': '🍜', '米粉': '🍜', '冬粉': '🍜', '河粉': '🍜', '義大利麵': '🍝', '麵': '🍜',
  '漢堡': '🍔', '披薩': '🍕', '牛排': '🥩', '火鍋': '🍲', '壽喜燒': '🍲', '羊肉爐': '🍲', '薑母鴨': '🍲',
  '生魚片': '🍣', '壽司': '🍣', '手卷': '🌯', '便當': '🍱', '餐盒': '🍱', '咖哩': '🍛', 
  '炸雞': '🍗', '香雞排': '🍗', '鹽酥雞': '🍗', '薯條': '🍟', 
  '蛋餅': '🌯', '水餃': '🥟', '鍋貼': '🥟', '煎餃': '🥟', '湯包': '🥟', '燒賣': '🥟', '包子': '🥟',
  '沙拉': '🥗', '三明治': '🥪', '吐司': '🍞', '麵包': '🥖', '可頌': '🥐', '熱狗': '🌭',
  '臭豆腐': '🥘', '滷味': '🥘', '鴨血': '🥘', '豆腐': '🥘', '大腸包小腸': '🌭', 
  '蚵仔煎': '🥞', '蔥抓餅': '🥞', '蔥油餅': '🥞', '煎餅': '🥞', '大阪燒': '🥞', '鬆餅': '🥞', 
  '肉圓': '🧆', '碗粿': '🧆', '肉': '🍖', '烤肉': '🍢', '串燒': '🍢',
  '濃湯': '🥣', '雞湯': '🥣', '湯': '🥣', '粥': '🥣', '鍋': '🍲', 
  '蛋糕': '🍰', '甜點': '🍮', '塔': '🍮', '冰淇淋': '🍦', '豆花': '🍨', '冰': '🍧', '湯圓': '🥣',
  '奶': '🧋', '咖啡': '☕', '飲料': '🥤', '茶': '🍵'
};

const getEmoji = (name: string) => {
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return '🍽️';
};

interface SwipeScreenProps {
  onSwipe: () => void;
  isHidden?: boolean;
  showToast?: (msg: string) => void;
  onResetSwipeCount?: () => void;
}

const ALL_FOODS = [
  "魯肉飯", "雞肉飯", "爌肉飯", "紅燒牛肉麵", "擔仔麵", "溫體牛肉湯", "虱目魚肚粥", "鱔魚意麵", "肉燥飯", "鍋燒意麵", "炸排骨飯", "滷腿庫飯", "古早味乾麵", "麻醬麵", "陽春麵", "鮮肉餛飩麵", "香菇肉羹麵", "沙茶魷魚羹麵", "大腸包小腸", "蚵仔煎", "蝦仁飯", "筒仔米糕", "彰化肉圓", "傳統碗粿", "肉絲炒米粉", "豬血湯加炒麵", "綜合加熱滷味", "鹽酥雞拼盤", "碳烤香雞排", "豬腸四神湯", "豚骨拉麵", "醬油拉麵", "味噌拉麵", "鹽味拉麵", "日式咖哩飯", "炸豬排飯定食", "親子丼", "日式牛丼", "炸蝦天婦羅丼", "蒲燒鰻魚飯", "綜合握壽司", "刺身定食", "烤鯖魚定食", "鮭魚茶泡飯", "日式炒麵", "章魚燒", "鐵板大阪燒", "廣島燒", "讚岐烏龍麵", "蕎麥冷麵", "炸蝦天婦羅", "北海道湯咖哩", "壽喜燒", "日式涮涮鍋", "日式關東煮", "和風漢堡排", "日式蛋包飯", "炸雞唐揚定食", "生魚片海鮮丼", "烤秋刀魚定食", "綠咖哩雞肉飯", "泰式紅咖哩牛", "瑪莎曼咖哩", "泰式打拋豬肉飯", "月亮蝦餅", "泰式炒河粉", "冬蔭功海鮮湯", "泰式清蒸檸檬魚", "蝦醬空心菜配白飯", "海鮮涼拌冬粉", "越南生牛肉河粉", "越南烤肉米線", "越式法國麵包", "越式生春捲", "海南雞飯", "星馬肉骨茶", "叻沙麵", "檳城炒粿條", "咖椰吐司配半熟蛋", "印尼炒麵", "韓式烤五花肉", "經典石鍋拌飯", "韓式洋釀炸雞", "韓式泡菜鍋", "韓式大醬湯", "豆腐乳鍋", "韓式部隊鍋", "辣炒年糕", "韓式炸醬麵", "綜合海鮮煎餅", "泡菜煎餅", "韓式水冷麵", "雪濃湯", "人蔘雞湯", "辣炒春雞", "馬鈴薯豬骨湯", "韓式麻油飯捲", "韓式雜菜冬粉", "辣魷魚拌飯", "韓式石鍋蒸蛋", "瑪格麗特披薩", "夏威夷披薩", "義式臘腸披薩", "海鮮總匯披薩", "經典肉醬義大利麵", "奶油培根義大利麵", "白酒蛤蜊義大利麵", "青醬雞肉義大利麵", "威尼斯墨魚燉飯", "松露野菇燉飯", "西班牙海鮮燉飯", "經典牛肉漢堡", "雙層起司漢堡", "英式炸魚薯條", "碳烤豬肋排", "紐約客牛排", "菲力牛排", "肋眼牛排", "威靈頓牛排", "法式烤春雞", "英式牧羊人派", "義大利麵疙瘩", "義式千層麵", "香煎鮭魚排", "奶油蘑菇濃湯配法式麵包", "凱薩沙拉烤雞", "德式香腸拼盤", "墨西哥捲餅", "墨西哥夾餅", "美式熱狗堡", "麻婆豆腐飯", "宮保雞丁飯", "糖醋排骨飯", "青椒肉絲飯", "回鍋肉配白飯", "魚香茄子煲", "蒜泥白肉", "蔥爆牛肉", "乾煸四季豆", "蝦仁烘蛋", "揚州炒飯", "台式肉絲炒麵", "廣州炒麵", "港式飲茶", "臘味煲仔飯", "黯然銷魂飯", "港式明爐燒鵝飯", "玫瑰油雞腿飯", "鮮蝦雲吞麵", "乾炒牛河", "避風塘炒蟹", "川味水煮魚", "重慶酸菜魚", "北京烤鴨", "單人份佛跳牆", "紅燒獅子頭", "紹興醉雞", "韭菜豬肉水餃", "高麗菜豬肉水餃", "冰花脆皮鍋貼", "川味麻辣火鍋", "日式昆布鍋", "起司牛奶鍋", "養生番茄鍋", "大腸臭臭鍋", "海鮮總匯小火鍋", "傳統石頭火鍋", "岡山羊肉爐", "炭火薑母鴨", "古早味燒酒雞", "剝皮辣椒雞湯", "蒜頭蛤蜊雞湯", "日式串燒拼盤", "韓式烤肉拼盤", "台式鐵板燒", "炭烤鮮蛤蜊", "夜市烤玉米", "蒙古烤肉", "川味串串香", "韓式銅盤烤肉", "地中海烤蔬菜沙拉", "雞胸肉溫沙拉", "舒肥牛排健康餐盒", "酪梨鮮蝦吐司", "健康燕麥碗", "日式蔬菜素咖哩", "香菇素肉飯", "素什錦湯麵", "燙青菜綜合拼盤", "無糖水果優格碗", "全麥雞肉三明治", "日式蕎麥涼麵", "越式低卡蔬菜捲", "柴魚涼拌豆腐", "和風涼拌海帶芽", "低脂水煮雞肉餐盒", "烤地瓜配無糖豆漿", "藜麥毛豆沙拉", "鷹嘴豆泥配口袋餅", "鮮果燕麥優格飲", "三杯雞飯", "鐵板麵", "黑胡椒牛排麵", "蘑菇豬排麵", "蚵仔麵線", "大腸麵線", "清麵線", "肉羹麵", "花枝羹麵", "魷魚羹麵", "土魠魚羹麵", "蝦捲飯", "炸雞排飯", "烤肉飯", "香腸飯", "豬排咖哩飯", "雞排咖哩飯", "魚排咖哩飯", "炸蝦咖哩飯", "可樂餅咖哩飯", "牛肉咖哩飯", "蔬菜咖哩飯", "起司豬排飯", "泡菜豬肉飯", "蔥爆羊肉飯", "滑蛋牛肉飯", "滑蛋蝦仁飯", "蝦仁炒飯", "肉絲炒飯", "鮭魚炒飯", "火腿炒飯", "蛋炒飯", "翡翠炒飯", "櫻花蝦炒飯", "鳳梨炒飯", "咖哩炒飯", "泡菜炒飯", "什錦炒飯", "牛肉炒飯", "羊肉炒飯", "鹹魚雞粒炒飯", "素炒飯", "海鮮炒烏龍麵", "肉絲炒烏龍麵", "泡菜炒烏龍麵", "明太子烏龍麵", "豆皮烏龍麵", "月見烏龍麵", "咖哩烏龍麵", "豚骨烏龍麵", "昆布烏龍麵", "麻辣烏龍麵", "番茄牛肉麵", "清燉牛肉麵", "蔥燒牛肉麵", "牛筋麵", "牛肚麵", "半筋半肉牛肉麵", "三寶牛肉麵", "炸醬麵", "榨菜肉絲麵", "雪菜肉絲麵", "雞絲麵", "排骨酥麵", "鴨肉麵", "鵝肉麵", "羊肉爐麵線", "當歸鴨麵線", "麻油雞麵線", "豬腳麵線", "蚵仔湯", "蛤蜊湯", "豬血湯", "貢丸湯", "魚丸湯", "虱目魚丸湯", "餛飩湯", "蛋花湯", "紫菜湯", "味噌湯", "蘿蔔湯", "竹筍湯", "排骨湯", "冬瓜蛤蜊湯", "苦瓜排骨湯", "金針排骨湯", "蘿蔔排骨湯", "蛤蜊排骨湯", "酸辣湯", "玉米濃湯", "南瓜濃湯", "蘑菇濃湯", "海鮮濃湯", "酥皮濃湯", "羅宋湯", "洋蔥湯", "巧達濃湯", "番茄蔬菜湯", "義式蔬菜湯", "法式海鮮湯", "韓式豆腐湯", "辣魚湯", "海帶湯", "豆芽湯", "蜆仔湯", "魚皮湯", "鱸魚湯", "雞湯", "蒜頭雞湯", "香菇雞湯", "鳳梨苦瓜雞湯", "菜脯雞湯", "仙草雞湯", "何首烏雞湯", "四物雞湯", "十全大補湯", "羊肉湯", "牛肉清湯", "牛雜湯", "滷肉飯加蛋", "雞肉飯加蛋", "控肉飯加筍絲", "豬腳飯", "蹄膀飯", "焢肉飯", "燒肉飯", "烤鴨飯", "油雞飯", "叉燒飯", "三寶飯", "四寶飯", "脆皮燒肉飯", "蜜汁烤排骨飯", "鹹豬肉飯", "蒜泥白肉飯", "梅干扣肉飯", "東坡肉飯", "椒麻雞飯", "綠咖哩豬肉飯", "紅咖哩雞肉飯", "黃咖哩牛肉飯", "帕能咖哩飯", "叢林烤牛肉飯", "泰式烤豬肉飯", "泰式海鮮沙拉飯", "泰式炒泡麵", "泰式米線", "越式涼拌米線", "越式炒麵", "越式排骨飯", "星洲炒米粉", "廣東炒麵", "福州炒麵", "廈門炒麵", "溫州大餛飩", "紅油抄手", "白油抄手", "擔擔麵", "重慶小麵", "蘭州拉麵", "刀削麵", "貓耳朵", "疙瘩麵", "涼麵", "雞絲涼麵", "麻醬涼麵", "炸醬涼麵", "泰式涼麵", "日式涼麵", "韓式冷麵", "蕎麥麵", "烏龍冷麵", "素麵", "義大利涼麵", "沙拉麵", "吐司夾蛋", "總匯三明治", "鮪魚三明治", "燻雞三明治", "培根三明治", "起司三明治", "火腿三明治", "果醬吐司", "厚片吐司", "奶油吐司", "大蒜吐司", "奶酥吐司", "花生吐司", "巧克力吐司", "草莓吐司", "藍莓吐司", "香蕉巧克力吐司", "冰火菠蘿油", "豬扒包", "蛋塔", "葡式蛋塔", "雞蛋仔", "格仔餅", "鬆餅", "舒芙蕾", "法式吐司", "可麗餅", "帕尼尼", "貝果", "滿福堡", "豬肉滿福堡", "麥香魚", "麥香雞", "雙層牛肉吉事堡", "大麥克", "勁辣雞腿堡", "卡啦雞腿堡", "烤雞腿堡", "米漢堡", "燒肉珍珠堡", "薑燒豬肉米漢堡", "藜麥米漢堡", "素漢堡", "植物肉漢堡", "潛艇堡", "肉丸潛艇堡", "鮪魚潛艇堡", "照燒雞肉潛艇堡", "義大利麵沙拉", "馬鈴薯沙拉", "地瓜沙拉", "蛋沙拉", "水果沙拉", "生菜沙拉", "和風沙拉", "芝麻醬沙拉", "千島沙拉", "蜂蜜芥末沙拉", "塔塔醬海鮮", "炸魷魚圈", "炸洋蔥圈", "炸薯條", "炸地瓜條", "炸起司條", "炸雞塊", "炸雞翅", "炸雞腿", "烤雞翅", "烤雞腿", "紐奧良烤雞", "德州烤肉", "巴西烤肉", "土耳其烤肉", "希臘烤肉", "印度烤餅", "印度咖哩雞", "印度坦都里烤雞", "印度奶油雞", "薩摩沙", "墨西哥起司薄餅", "墨西哥法士達", "墨西哥辣豆醬", "墨西哥玉米片", "古巴三明治", "牙買加烤雞", "秘魯烤雞", "阿根廷烤肉", "智利餡餅", "西班牙烘蛋", "葡萄牙海鮮飯", "義大利香腸", "法式鹹派", "德國豬腳", "奧地利炸豬排", "瑞士起司鍋", "俄羅斯羅宋湯", "烏克蘭餃子", "波蘭餃子", "瑞典肉丸", "芬蘭鮭魚湯", "挪威燻鮭魚", "丹麥開口三明治", "比利時淡菜", "荷蘭煎餅", "英國牛肉派", "愛爾蘭燉肉", "蘇格蘭肉湯", "威爾斯兔子", "澳洲肉派", "紐西蘭烤羊排", "夏威夷拌飯", "大溪地生魚片", "泰式檸檬豬肉", "椒鹽排骨", "三杯中卷", "薑絲大腸", "鐵板豆腐", "麻辣鴨血", "臭豆腐", "炸春捲", "生菜包肉", "咖哩魚蛋", "鮭魚握壽司", "鮪魚握壽司", "旗魚握壽司", "鯛魚握壽司", "海膽軍艦", "鮭魚卵軍艦", "蟹膏軍艦", "龍蝦沙拉手捲", "蘆筍手捲", "鮮蝦手捲", "星鰻握壽司", "比目魚鰭邊肉", "干貝握壽司", "甜蝦握壽司", "牡丹蝦握壽司", "軟絲握壽司", "章魚握壽司", "玉子燒握壽司", "稻荷壽司", "花壽司", "太卷", "鐵火卷", "蔥花鮪魚卷", "加州卷", "炸蝦卷", "酪梨壽司", "炙燒鮭魚壽司", "炙燒比目魚", "炙燒干貝", "炙燒和牛壽司", "散壽司", "鯖魚押壽司", "蜜汁叉燒包", "蠔皇叉燒包", "奶黃包", "流沙包", "蓮蓉包", "芝麻包", "芋泥包", "小籠包", "蟹黃小籠包", "絲瓜小籠包", "生煎包", "水煎包", "鮮肉包", "菜肉包", "高麗菜包", "韭菜包", "筍肉包", "叉燒酥", "蘿蔔絲餅", "蔥抓餅", "蔥肉餅", "牛肉餡餅", "豬肉餡餅", "韭菜盒", "鮮肉蒸餃", "鮮蝦蒸餃", "牛肉蒸餃", "羊肉蒸餃", "素食蒸餃", "鮮肉湯包", "蝦仁燒賣", "豬肉燒賣", "魚子燒賣", "糯米丸子", "珍珠丸子", "鼓汁排骨", "蠔皇鳳爪", "鮮竹卷", "蘿蔔糕", "芋頭糕", "鮮蝦腸粉", "牛肉腸粉", "叉燒腸粉", "油條腸粉", "芝麻球", "鹹水角", "蛋黃酥", "蔥爆豬肉", "沙茶牛肉", "沙茶羊肉", "芹菜炒魷魚", "九層塔炒蛤蜊", "塔香海瓜子", "九層塔炒蛋", "菜脯蛋", "蔥花蛋", "蝦仁炒蛋", "番茄炒蛋", "魚香肉絲", "京醬肉絲", "糖醋魚", "紅燒魚", "清蒸石斑魚", "豆瓣魚", "砂鍋魚頭", "鳳梨蝦球", "鹽酥蝦", "紹興醉蝦", "胡椒蝦", "蒜泥鮮蚵", "豆豉鮮蚵", "蚵仔酥", "炸花枝", "醬烤魷魚", "滷味拼盤", "滷牛腱", "滷牛肚", "滷海帶", "滷豆干", "滷百頁豆腐", "燙地瓜葉", "燙高麗菜", "燙空心菜", "燙大陸妹", "燙青江菜", "炒高麗菜", "炒空心菜", "炒菠菜", "炒水蓮", "炒芥藍", "炒莧菜", "炒山蘇", "炒川七", "炒龍鬚菜", "炒小白菜", "炒大白菜", "培根高麗菜", "蝦醬高麗菜", "腐乳空心菜", "蒜炒花椰菜", "涼拌小黃瓜", "涼拌木耳", "涼拌海蜇皮", "涼拌豬耳", "涼拌鴨賞", "皮蛋豆腐", "鹹蛋苦瓜", "醬燒茄子", "涼拌茄子", "梅干扣肉", "桔醬白肉", "菜脯炒肉絲", "肉絲炒粄條", "肉絲炒米苔目", "鹹米苔目湯", "客家鹹湯圓", "鮮肉湯圓", "傻瓜乾麵", "烏醋乾麵", "福州乾麵", "鹽水意麵", "切仔麵", "榨菜肉絲湯麵", "大滷麵", "刀削牛肉麵", "蕃茄雞蛋麵", "芝心披薩", "四季披薩", "四種起司披薩", "蘑菇披薩", "鮮蔬披薩", "燻鮭魚披薩", "烤雞披薩", "墨西哥辣味披薩", "松露披薩", "蒜香披薩", "拿坡里披薩", "羅馬披薩", "佛羅倫斯披薩", "米蘭披薩", "義式肉丸披薩", "義大利起司餃", "筆管麵", "螺旋麵", "蝴蝶麵", "貝殼麵", "寬扁麵", "天使細麵", "墨魚義大利麵", "焗烤肉醬麵", "焗烤海鮮麵", "焗烤奶油雞肉麵", "焗烤海鮮飯", "焗烤馬鈴薯", "焗烤南瓜", "焗烤蘑菇", "普羅旺斯燉菜", "法式紅酒燉牛肉", "勃根地燉牛肉", "紅酒燉羊膝", "燉牛頰肉", "香烤羊排", "法式烤乳豬", "香烤火雞", "北京烤鴨卷餅", "德式烤豬腳", "法式香煎鴨胸", "香煎鴨肝", "香煎干貝", "香煎海鱸魚", "烤智利鮭魚", "香煎鱈魚排", "比目魚排", "焗烤大龍蝦", "奶油蒜香蝦", "西班牙蒜味蝦", "奶油培根燉飯", "南瓜雞肉燉飯", "蘑菇燉飯", "牛肝菌燉飯", "菠菜燉飯", "番茄海鮮燉飯", "羅勒青醬燉飯", "松露野菇燉飯", "起司燉飯", "韓式烤牛排骨", "韓式辣炒魷魚", "韓式辣炒豬肉", "韓式辣拌冬粉", "韓式泡菜炒飯", "韓式鮪魚炒飯", "韓式午餐肉炒飯", "韓式紫菜包飯", "韓式辣拌麵", "韓式冷拌麵", "炸醬炒年糕", "起司辣炒年糕", "玫瑰醬炒年糕", "蒜味醬油炸雞", "蔥絲炸雞", "雪花起司炸雞", "韓式大醬鍋", "韓式清湯鍋", "韓式雪濃牛骨湯", "韓式牛尾湯", "韓式血腸湯", "韓式豬肉湯飯", "韓式鮑魚粥", "韓式南瓜粥", "醬汁鰻魚丼", "炸蝦天丼", "他人丼", "中華丼", "麻婆豆腐丼", "日式燒肉丼", "雞肉照燒丼", "牛肉照燒丼", "薑汁豬肉丼", "滑蛋豬排丼", "鮭魚親子丼", "海鮮散壽司", "鮪魚蔥花丼", "蔥鹽牛舌丼", "明太子秋刀魚", "鹽烤魚下巴", "鹽烤香魚", "烤透抽", "烤明太子馬鈴薯", "日式烤飯糰", "明太子烤飯糰", "鮭魚烤飯糰", "紫蘇梅飯糰", "昆布飯糰", "鰹魚飯糰", "鮪魚美乃滋飯糰", "日式炸漢堡排", "日式炸牡蠣", "日式炸竹莢魚", "日式炸肉餅", "南瓜可樂餅", "咖哩可樂餅", "奶油蟹肉可樂餅", "日式炸蝦排", "日式炸花枝排", "日式炸豆腐", "泰式酸辣蝦湯", "泰式椰奶雞湯", "泰式黃咖哩雞", "泰式青木瓜沙拉", "泰式涼拌海鮮", "泰式涼拌牛肉", "泰式烤松阪豬", "泰式香蘭葉包雞", "泰式金錢蝦餅", "泰式炸魚餅", "泰式鳳梨炒飯", "泰式炒寬粉", "越南炸春捲", "越南涼拌雞絲", "越南咖哩雞", "越南烤豬肉飯", "越南越式煎餅", "印尼炒飯", "印尼沙嗲串烤", "馬來西亞椰漿飯", "馬來西亞咖哩魚頭", "新加坡辣椒蟹", "新加坡黑胡椒蟹", "新加坡肉乾", "印度香料烤飯", "印度羊肉咖哩", "印度菠菜起司咖哩", "印度鷹嘴豆咖哩", "印度海鮮咖哩", "印度蔬菜咖哩", "印度扁豆湯", "斯里蘭卡咖哩", "緬甸茶葉沙拉", "緬甸魚湯麵", "柬埔寨阿莫克魚", "清蒸肉圓", "油炸肉圓", "水煮涼圓", "基隆廟口鼎邊銼", "宜蘭糕渣", "宜蘭卜肉", "宜蘭鴨賞", "新竹炒米粉", "花枝羹麵線", "魷魚羹麵線", "大腸肉羹麵線", "當歸鴨麵線", "當歸羊肉湯", "麻油腰子", "麻油豬肝", "麻油松阪豬", "麻油土雞", "燒酒蝦", "藥燉排骨", "藥燉土虱", "炭火薑母鴨", "岡山羊肉爐", "台式刈包", "南部水煮粽", "北部3D油飯粽", "客家粄粽", "鹼粽", "客家乾粄條", "什錦炒米粉", "沙茶炒冬粉", "肉絲炒麵", "海鮮炒烏龍麵", "廣東炒伊麵", "港式炒公仔麵", "台式炒泡麵", "蘑菇鐵板麵", "黑胡椒鐵板麵", "茄汁義大利麵", "皮蛋瘦肉粥", "滑蛋牛肉粥", "狀元及第粥", "生滾魚片粥", "台式海鮮粥", "台南虱目魚粥", "大甲芋頭粥", "地瓜清粥", "清粥小菜", "台南鹹粥", "筍絲香菇粥", "香菇肉粥", "健康綠豆粥", "養生紅豆粥", "臘八粥", "麥片粥", "牛奶燕麥粥", "藜麥粥", "低脂雞胸肉沙拉", "鮪魚洋蔥沙拉", "煙燻鮭魚沙拉", "烤牛肉沙拉", "鮮蝦酪梨沙拉", "涼拌豆腐沙拉", "日式海帶沙拉", "蒜香蕈菇沙拉", "綜合堅果沙拉", "熱帶水果沙拉", "原味優格沙拉", "經典凱薩沙拉", "和風芝麻沙拉", "義式油醋沙拉", "蜂蜜芥末沙拉", "千島醬沙拉", "塔塔醬沙拉", "莎莎醬玉米片", "酪梨番茄沙拉", "藜麥毛豆沙拉", "鷹嘴豆泥沙拉", "櫛瓜麵條", "花椰菜米炒飯", "健康蒟蒻麵", "高蛋白豆腐麵", "燕麥奶火鍋", "無糖豆漿火鍋", "番茄蔬菜火鍋", "南瓜牛奶火鍋", "咖哩海鮮火鍋", "味噌豆腐火鍋", "韓式泡菜火鍋", "東北酸白菜火鍋", "川味麻辣火鍋", "藥膳養生火鍋", "北海道昆布火鍋", "綜合海鮮火鍋", "梅花豬肉火鍋", "雪花牛肉火鍋", "小羔羊肉火鍋", "去骨雞腿火鍋", "櫻桃鴨肉火鍋", "鮮魚片火鍋", "健康素食火鍋", "台式臭臭鍋", "沙茶魚頭鍋", "蒜頭蛤蠣鍋", "剝皮辣椒雞鍋", "燒酒烏骨雞鍋", "台式石頭火鍋", "韓式銅盤烤肉", "台式平價鐵板燒", "日式串燒", "台式熱炒", "辦桌桌菜", "私廚手路菜", "家常便當", "自助餐拼盤", "輕食早午餐拼盤", "港式茶點", "法式甜點", "草莓蛋糕", "手工餅乾", "歐式麵包", "厚片吐司", "總匯三明治", "美式漢堡", "義式披薩", "白醬義大利麵", "青醬燉飯", "日式咖哩飯", "日式蛋包飯", "豬排蓋飯", "牛五花丼飯", "肉絲炒飯", "牛肉燴飯", "古早味滷肉飯", "嘉義雞肉飯", "香炸排骨飯", "蜜汁烤雞腿飯", "爌肉筍絲飯", "萬巒豬腳飯", "炭火燒肉飯", "台式烤肉飯", "台式香腸飯", "海鮮炒麵", "陽春湯麵", "麻醬乾麵", "台式涼麵", "焗烤義大利麵", "讚岐烏龍麵", "信州蕎麥麵", "博多拉麵", "沾麵", "埔里米粉", "綠豆冬粉", "美濃粄條", "台東米苔目", "手工麵線", "高麗菜水餃", "韭菜鍋貼", "高麗菜煎餃", "鮮肉蒸餃", "牛肉湯餃", "上海小籠包", "絲瓜湯包", "鮮肉生煎包", "牛肉餡餅", "韭菜盒子", "手工蔥抓餅", "三星蔥油餅", "起司蛋餅", "港式蘿蔔糕", "大甲芋頭糕", "台南碗粿", "彰化肉圓", "北部粽", "南部粽", "虎咬豬刈包", "夜市潤餅", "炸春捲", "炭烤地瓜", "炭烤玉米", "台灣鹽酥雞", "香雞排", "碳烤魷魚絲", "澎湖花枝丸", "新竹貢丸湯", "虱目魚丸湯", "鮮甜蛤蜊湯", "新鮮蚵仔湯", "韭菜豬血湯", "台式酸辣湯", "法式玉米濃湯", "黃金南瓜濃湯", "俄式羅宋湯", "日式味噌湯", "豚骨濃湯", "香菇雞湯", "清燉牛肉湯", "當歸羊肉湯", "鮮美魚湯", "田園蔬菜湯"
];

export const SwipeScreen: React.FC<SwipeScreenProps> = ({ onSwipe, isHidden = false, showToast, onResetSwipeCount }) => {
  const [foods, setFoods] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const defaultMoods = ['一個人', '疲憊求療癒', '想找人揪', '犒賞自己', '健康優先'];
  const [moodTags, setMoodTags] = useState<string[]>([defaultMoods[Math.floor(Math.random() * defaultMoods.length)]]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [swipes, setSwipes] = useState<any[]>([]);
  const [animClass, setAnimClass] = useState('');
  const [feedback, setFeedback] = useState('');

  // NOTE: 拖曳手勢相關狀態
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = React.useRef(false); // 使用 ref 避免 closure 過期問題導致 move 事件覆寫飛出位移
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragOffsetRef = React.useRef({ x: 0, y: 0 }); // 儲存最新的拖曳距離，避免 end 時 closure state 尚未更新

  // NOTE: 每日強制登入選心情相關狀態
  const [showMoodModal, setShowMoodModal] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('today_mood_date');
    if (lastDate !== today) {
      setShowMoodModal(true);
      generateRandomFoods(false);
    } else {
      const savedTagsStr = localStorage.getItem('today_mood_tags');
      const savedTags = savedTagsStr ? JSON.parse(savedTagsStr) : null;
      if (savedTags) {
        setMoodTags(savedTags);
        generateRandomFoods(true, savedTags);
      } else {
        // 如果遇到有 date 卻沒有 tags 的情況 (舊版邏輯殘留)，強制重新選擇
        setShowMoodModal(true);
        generateRandomFoods(false);
      }
    }
  }, []);

  /**
   * 處理拖曳/滑動開始事件
   */
  const handleDragStart = (clientX: number, clientY: number) => {
    if (currentIndex >= foods.length || animClass !== '') return;
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
    dragOffsetRef.current = { x: 0, y: 0 };
  };

  /**
   * 處理拖曳/滑動進行中事件，更新位移量
   */
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const x = clientX - dragStart.x;
    const y = clientY - dragStart.y;
    setDragOffset({ x, y });
    dragOffsetRef.current = { x, y };
  };

  /**
   * 處理拖曳/滑動結束事件，判定是否觸發滑動或彈回
   */
  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    setIsDragging(false);
    isDraggingRef.current = false;

    const SWIPE_THRESHOLD = 120;
    const currentOffsetX = dragOffsetRef.current.x;

    if (currentOffsetX > SWIPE_THRESHOLD) {
      // NOTE: 向右拖曳判定為今晚候補 (right)
      handleSwipe('right');
    } else if (currentOffsetX < -SWIPE_THRESHOLD) {
      // NOTE: 向左拖曳判定為不想吃 (left)
      handleSwipe('left');
    } else {
      // 只有未觸發滑動時，才彈回中心
      setDragOffset({ x: 0, y: 0 });
      dragOffsetRef.current = { x: 0, y: 0 };
    }
  };


  const generateRandomFoods = (shouldStartSession = true, savedMoods?: string[]) => {
    const shuffled = [...ALL_FOODS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 15).map(name => ({
      name,
      zone: '在地美食',
      desc: '大家都愛吃',
      tags: ['健康優先']
    }));
    setFoods(selected);
    if (shouldStartSession) {
      startSession(savedMoods);
    }
  };

  const startSession = async (overrideMoods?: string[]) => {
    try {
      const res = await apiClient.post('/api/v1/session/start', { mood_tags: overrideMoods || moodTags });
      setSessionId(res.data.session_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoodSelect = (mood: string) => {
    setMoodTags([mood]);
    localStorage.setItem('today_mood_date', new Date().toDateString());
    localStorage.setItem('today_mood_tags', JSON.stringify([mood]));
    setShowMoodModal(false);
    startSession([mood]);
  };

  const handleSwipe = async (action: 'left' | 'right' | 'heart', emotion: string = '') => {
    if (currentIndex >= foods.length || animClass !== '') return;
    
    // 設定飛出去的 X 軸目標位置 (px)
    const swipeX = action === 'left' ? -500 : 500;
    setDragOffset({ x: swipeX, y: dragOffsetRef.current.y });
    dragOffsetRef.current = { x: swipeX, y: dragOffsetRef.current.y };

    if (emotion) {
      setFeedback(`標記「${emotion}」已紀錄`);
      setAnimClass('anim-right');
    } else if (action === 'heart') {
      setFeedback('加入必吃清單♡');
      setAnimClass('anim-right');
    } else if (action === 'right') {
      setFeedback('加入今晚候補✓');
      setAnimClass('anim-right');
    } else {
      setFeedback('');
      setAnimClass('anim-left');
    }

    setTimeout(async () => {
      setAnimClass('');
      setFeedback('');
      setDragOffset({ x: 0, y: 0 }); // 切換卡片時重置位移量
      dragOffsetRef.current = { x: 0, y: 0 };
      
      const food = foods[currentIndex];
      const newSwipe = {
        food_name: food.name,
        food_zone: food.zone,
        action: action,
        emotion_tag: emotion
      };
      
      const newSwipes = [...swipes, newSwipe];
      setSwipes(newSwipes);
      setCurrentIndex(prev => prev + 1);
      onSwipe(); // Update counter

      if (sessionId) {
        try {
          const res = await apiClient.post('/api/v1/session/submit', {
            session_id: sessionId,
            swipes: [newSwipe],
            mood_tags: moodTags
          });
          
          // NOTE: 功能3 - 影響力數據回饋，優先顯示後端計算的排名變化通知
          const impacts = res.data?.impact_messages || [];
          if (impacts.length > 0) {
            showToast?.(impacts[0]);
          } else if (action === 'heart' || action === 'right') {
            showToast?.('你的選擇影響了區域熱度榜！');
          }
        } catch (e) {
          console.error(e);
        }
      }
    }, 320); // Wait for the 320ms CSS transition
  };

  const currentFood = foods[currentIndex];
  const nextFood = foods[currentIndex + 1];

  // NOTE: 動態計算卡片拖曳與旋轉樣式
  const cardStyle: React.CSSProperties = {
    transform: isDragging || dragOffset.x !== 0
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.05}deg)`
      : 'translate3d(0, 0, 0) rotate(0deg)',
    transition: isDragging
      ? 'none'
      : animClass !== ''
        ? 'transform 0.35s ease-in, opacity 0.35s ease-in'
        : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none'
  };

  /**
   * 獲取動態覆蓋提示層 (hint-ov) 的透明度
   */
  const getHintOpacity = () => {
    if (isDragging) {
      return Math.min(1, Math.abs(dragOffset.x) / 100);
    }
    return animClass ? 1 : 0;
  };

  /**
   * 獲取動態覆蓋提示層的類型 (sl: ✕, sr: ♡)
   */
  const getHintType = () => {
    if (isDragging) {
      return dragOffset.x > 0 ? 'sr' : dragOffset.x < 0 ? 'sl' : '';
    }
    return animClass === 'anim-left' ? 'sl' : animClass === 'anim-right' ? 'sr' : '';
  };

  /**
   * 獲取動態覆蓋提示層顯示文字
   */
  const getHintText = () => {
    if (isDragging) {
      return dragOffset.x > 0 ? '♡' : dragOffset.x < 0 ? '✕' : '';
    }
    return animClass === 'anim-left' ? '✕' : animClass === 'anim-right' ? '♡' : '';
  };

  return (
    <div 
      className="screen active" 
      style={{ display: isHidden ? 'none' : 'flex' }}
      onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handleDragEnd}
    >
      <div className="mood-bar">
        <div className="mood-label">今天的狀態</div>
        <div className="mood-pills">
          {defaultMoods.map(m => (
            <div 
              key={m} 
              className={`mood-pill ${moodTags.includes(m) ? 'sel' : ''}`}
              onClick={() => {
                setMoodTags([m]);
                localStorage.setItem('today_mood_date', new Date().toDateString());
                localStorage.setItem('today_mood_tags', JSON.stringify([m]));
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
      
      {/* 每日首次登入強制選心情 Modal */}
      {showMoodModal && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(252, 248, 243, 0.95)' }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '320px', padding: '30px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>👋</div>
            <div className="modal-title" style={{ fontSize: '24px', color: 'var(--brown-d)', marginBottom: '10px' }}>早安！今天心情如何？</div>
            <div className="modal-sub" style={{ marginBottom: '25px', color: 'var(--brown)' }}>選個心情，讓我們為你推薦最對味的晚餐。</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {defaultMoods.map(m => (
                <button 
                  key={m}
                  className="rbtn pr"
                  style={{ width: '100%', margin: 0, padding: '12px', fontSize: '16px' }}
                  onClick={() => handleMoodSelect(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {currentIndex >= 15 || currentIndex >= foods.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '64px', filter: 'drop-shadow(0 4px 12px var(--sh))' }}>🎉</div>
          <div style={{ fontFamily: '"Noto Serif TC", serif', fontSize: '20px', color: 'var(--brown)', fontWeight: 600 }}>本輪卡片刷完囉！</div>
          <button 
            onClick={() => {
              setCurrentIndex(0);
              setSwipes([]);
              onResetSwipeCount?.();
              generateRandomFoods();
            }}
            style={{ padding: '12px 32px', borderRadius: '99px', border: 'none', background: '#D69E5C', color: 'white', fontSize: '16px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
          >
            再刷一輪
          </button>
        </div>
      ) : (
        <div className="card-arena">
          {nextFood && (
            <div className="dinner-card behind" key={`behind-${currentIndex}`}>
              <div className="card-img">{getEmoji(nextFood.name)}</div>
              <div className="card-body">
                <div className="card-name">{nextFood.name}</div>
              </div>
            </div>
          )}
          
          <div 
            className={`dinner-card front ${animClass}`}
            key={`front-${currentIndex}`}
            style={cardStyle}
            onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
          >
            <div 
              className={`hint-ov ${getHintType()}`}
              style={{ opacity: getHintOpacity(), transition: isDragging ? 'none' : 'opacity 0.2s' }}
            >
              {getHintText()}
            </div>
            <div className="card-img">
              <span className="heat-badge">🔥 熱門</span>
              {getEmoji(currentFood.name)}
            </div>
            <div className="card-body">
              <div className="card-name">{currentFood.name}</div>
              <div className="card-desc">{currentFood.desc}</div>
              <div className="card-tags">
                {currentFood.tags.map((t: string) => <span key={t} className="ctag">{t}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="emotion-tray" style={{ opacity: (currentIndex >= 15) ? 0.3 : 1, pointerEvents: (currentIndex >= 15) ? 'none' : 'auto' }}>
        <div className="swipe-feedback" style={{ opacity: feedback ? 1 : 0 }}>
          {feedback || '\u00A0'}
        </div>
        <div className="emotion-tray-label">這道菜讓你有什麼感受？</div>
        <div className="emotion-grid">
          {['🔥渴望', '🫂療癒', '💭懷念', '👀好奇', '👫揪人', '📅改天'].map(em => (
            <div 
              key={em} 
              className="etag" 
              onClick={() => handleSwipe('heart', em.substring(2))}
              style={{ cursor: 'pointer' }}
            >
              {em.substring(0, 2)}<span>{em.substring(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="action-row" style={{ opacity: (currentIndex >= 15) ? 0.3 : 1, pointerEvents: (currentIndex >= 15) ? 'none' : 'auto' }}>
        <button className="abtn sm" onClick={() => handleSwipe('left')}>✕</button>
        <button className="abtn lg" onClick={() => handleSwipe('heart')}>♡</button>
        <button className="abtn sm right-btn" onClick={() => handleSwipe('right')}>→</button>
      </div>
    </div>
  );
};
