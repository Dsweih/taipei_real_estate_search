// firebase auth
var auth;
// google map
var map;
// google map 地理位置轉換物件
var geocoder;
// 資料
var data;
// 延遲時間
var delay = 300;
// 資料index
var index;
// 資料筆數
var addressLength;
// Marker array
var markers = [];

jQuery(document).ready(function($) {
    // Initialize firebase
    firebaseInit();

    // Bind form authenticated event
    authenticate();

    // Bind form validated event
    validate();
});

// Initialize Firebase
function firebaseInit() {
    var config = {
        apiKey: "AIzaSyCAnU2xNxTq-DGpmNIOhe-9flItI4B7iJk",
        authDomain: "realestatesearch-f9bd5.firebaseapp.com",
        databaseURL: "https://realestatesearch-f9bd5.firebaseio.com",
        storageBucket: "realestatesearch-f9bd5.appspot.com",
        messagingSenderId: "250593561419"
    };
    firebase.initializeApp(config);

    // 自訂驗證欄位訊息
    jQuery.extend(jQuery.validator.messages, {
        required: "此欄位必填",
        email: "請輸入正確的 Email 信箱",
        equalTo: "請再次輸入相同的值",
        minlength: $.validator.format("至少輸入 {0} 個字"),
        number: $.validator.format("請輸入數字"),
    });

    auth = firebase.auth();
}

// 身分驗證事件綁定
function authenticate() {
    var $registerPopup = $('.js--register-popup');
    var $loginPopup = $('.js--login-popup');
    var $overlay = $('.js--overlay');

    // 註冊表單驗證
    $registerPopup.children('form').validate({
        submitHandler: function(form) {
            var $form = $(form);
            var $email = $form.children('[name="register_email"]');
            var $pwd = $form.children('[name="register_pwd"]');
            auth.createUserWithEmailAndPassword($email.val(), $pwd.val()).then(function(result) {
                $overlay.find('input:not([type="submit"])').val('');
                // $email.val('');
                // $pwd.val('');
            }).catch(function(error) {
                // 處理錯誤區塊
                var errorCode = error.code;
                switch (errorCode) {
                    case 'auth/invalid-email':
                        $email.after('<label class="error">請輸入正確的 Email 信箱</label>');
                        break;
                    case 'auth/weak-password':
                        $pwd.after('<label class="error">至少輸入 6 個字</label>');
                        break;
                    case 'auth/email-already-in-use':
                        $email.after('<label class="error">此 Email 信箱已被使用</label>');
                        break;
                }
            });
        },
        errorPlacement: function(error, element) {
            element.after(error);
        },
        rules: {
            register_pwd: {
                minlength: 6
            }, 
            register_pwd_again: {
                equalTo: '#register_pwd'
            }
        }
    });

    // 登入表單驗證
    $loginPopup.children('form').validate({
        submitHandler: function(form) {
            var $form = $(form);
            var $email = $form.children('[name="login_email"]');
            var $pwd = $form.children('[name="login_pwd"]');
            auth.signInWithEmailAndPassword($email.val(), $pwd.val()).then(function(result) {
                $overlay.find('input:not([type="submit"])').val('');
                // $email.val('');
                // $pwd.val('');
            }).catch(function(error) {
                // 處理錯誤區塊
                var errorCode = error.code;
                switch (errorCode) {
                    case 'auth/invalid-email':
                        $email.after('<label class="error">請輸入正確的 Email 信箱</label>');
                        break;
                    case 'auth/wrong-password':
                        $pwd.after('<label class="error">請輸入正確的密碼</label>');
                        break;
                }
            });
        },
        errorPlacement: function(error, element) {
            element.after(error);
        }
    });

    // 登出按紐事件
    $('.js--title').on('click', '.js--btn-logout', function(event) {
        auth.signOut().then(function() {
            // console.log("User sign out!");
        }, function(error) {
            // console.log("User sign out error!");
        })
    });

    // google帳號登入事件
    $('.js--btn-google').on('click', function(event) {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then(function(result) {
            var token = result.credential.accessToken;
            var user = result.user; // 使用者資訊
        }).catch(function(error) {
            // 處理錯誤
            var errorCode = error.code;
            var errorMessage = error.message;
            // console.log(errorCode);
            // console.log(errorMessage);
        });
    });

    // 登入狀態變換事件
    auth.onAuthStateChanged(function(user) {
        if (user) {
            $overlay.hide();
            $('.js--title').append('<button class="btn logout js--btn-logout" type="button">登出</button>');
        } else {
            $loginPopup.show();
            $registerPopup.hide();
            $overlay.show();
            $('.js--btn-logout').remove();
        }
    });

    // 創建帳號按鈕事件
    $('.js--create-account').on('click', function(event) {
        event.preventDefault();
        $loginPopup.hide();
        $registerPopup.show();
    });

    // 取消按鈕事件
    $('.js--btn-cancel').on('click', function(event) {
        event.preventDefault();
        $loginPopup.show();
        $registerPopup.hide();
    });
};

// 初始 Google Map
function initMap() {
    var mapCanvas = document.getElementById('map');
    var mapOptions = {
        center: { lat: 23.9037, lng: 121.460809 },
        zoom: 13,
        mapTypeControl: false,
        scaleControl: true,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_CENTER
        },
        streetViewControl: false
    };
    map = new google.maps.Map(mapCanvas, mapOptions);

    // 地理編碼 - 將地址轉為地理座標
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: '台北市' }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            // 設定'台北市'為地圖中心
            map.setCenter(results[0].geometry.location);
        } else {
            console.log("Geocode was not successful for the following reason: " + status);
        }
    });

    getData();
}

// Get data from API
function getData() {
    // Get XML
    $.get('../str/realPrice.xml', function(xml) {
        // Convert to JSON
        var json = $.xml2json(xml);
        data = json.Body.RPWeekDataResponse.RPWeekDataResult.Rows.Row;
    });
}

// 搜尋結果
function search() {
    // Clear markers on the map
    clearMarkers();

    var returnedData;
    var center;
    // 行政區
    var districtList = document.getElementById("district");
    var district = districtList.options[districtList.selectedIndex].value;
    returnedData = $.grep(data, function(element, index) {
        return element.Col2.DISTRICT === district;
    });

    // 車位
    var parkCheck = document.getElementById("park").checked;
    returnedData = $.grep(returnedData, function(element, index) {
        return parkCheck ? element.Col25.PARKTYPE !== '' : element.Col25.PARKTYPE === '';
    });

    // 建物型態
    var typeList = document.getElementById("type");
    var type = typeList.options[typeList.selectedIndex].value;
    if (type !== '') {
        returnedData = $.grep(returnedData, function(element, index) {
            return element.Col11.BUITYPE === type;
        });
    }

    // 交易單價
    var unitPriceRangeFrom = document.getElementById("unitPriceRangeFrom").value;
    var unitPriceRangeEnd = document.getElementById("unitPriceRangeEnd").value;
    if (unitPriceRangeFrom !== '' && unitPriceRangeEnd !== '') {
        returnedData = $.grep(returnedData, function(element, index) {
            var unitPrice = parseFloat(element.Col23.UPRICE);
            return unitPrice >= unitPriceRangeFrom && unitPrice <= unitPriceRangeEnd;
        });
    }

    // 屋齡
    var ageList = document.getElementById("age");
    var ageSelect = ageList.options[ageList.selectedIndex].value;
    if (ageSelect !== '') {
        returnedData = $.grep(returnedData, function(element, index) {
            var age = getAge(element.Col14.FDATE);
            switch (ageSelect) {
                case '0':
                    return age <= 1;
                    break;
                case '1':
                    return age >= 1 && age <= 5;
                    break;
                case '5':
                    return age >= 5 && age <= 10;
                    break;
                case '10':
                    return age >= 10 && age <= 20;
                    break;
                case '20':
                    return age >= 20 && age <= 30;
                    break;
                case '30':
                    return age >= 30;
                    break;
            }
        });
    }

    // 交易總價
    var totalPriceRangeFrom = document.getElementById("totalPriceRangeFrom").value;
    var totalPriceRangeEnd = document.getElementById("totalPriceRangeEnd").value;
    if (totalPriceRangeFrom !== '' && totalPriceRangeEnd !== '') {
        returnedData = $.grep(returnedData, function(element, index) {
            var totalPrice = parseFloat(element.Col22.TPRICE);
            return totalPrice >= totalPriceRangeFrom && totalPrice <= totalPriceRangeEnd;
        });
    }

    // 資料筆數
    addressLength = returnedData.length;

    // index from 0
    index = 0;

    if (returnedData.length > 0) {
        // 地理編碼 - 將地址轉為地理座標
        geocoder.geocode({ address: '台北市' + district }, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                center = results[0].geometry.location;
                // 設定搜尋之行政區為地圖中心
                map.setCenter(center);
                // Set zoom to 14
                map.setZoom(14);
            } else {
                console.log("Geocode was not successful for the following reason: " + status);
            }
        });
        getGeocode(returnedData, index);
    } else {
        $('body').append('<div class="popupMsg"><p>找不到相關資料</p></div>');
        $('.popupMsg').fadeOut(2000, function() {
            this.remove();
        });
    }
}

// 搜尋表單欄位驗證
function validate() {
    $('header form').validate({
        submitHandler: function(form) {
            search();
        },
        errorPlacement: function(error, element) {
            element.after(error.css({
                    position: 'absolute', 
                    top: element.offset().top + 20, 
                    left: element.offset().left
                })
            );
        },
        rules: {
            // 行政區
            district: {
                required: true
            },
            // 交易單價
            unitPriceRangeFrom: {
                number: true,
                required: function(element) {
                    return $("#unitPriceRangeEnd").val().length > 0;
                }
            },
            unitPriceRangeEnd: {
                number: true,
                required: function(element) {
                    return $('#unitPriceRangeFrom').val().length > 0;
                }
            },
            // 交易總價
            totalPriceRangeFrom: {
                number: true,
                required: function(element) {
                    return $('#totalPriceRangeEnd').val().length > 0;
                }
            },
            totalPriceRangeEnd: {
                number: true,
                required: function(element) {
                    return $('#totalPriceRangeFrom').val().length > 0;
                }
            }
        }
    });

    // 行政區
    // var districtList = $('#district');
    // if (!districtList.find('option:selected').val()) {
    //     districtList.css({ backgroundColor: '#ff4f4f' });
    //     result = false;
    // }

    // 交易單價
    // var unitPriceRangeFrom = $('#unitPriceRangeFrom');
    // var unitPriceRangeEnd = $('#unitPriceRangeEnd');

    // if (unitPriceRangeFrom.val() !== '' || unitPriceRangeEnd.val() !== '') {
    //     if (parseFloat(unitPriceRangeFrom.val()) > parseFloat(unitPriceRangeEnd.val())) {
    //         unitPriceRangeFrom.css({ backgroundColor: '#ff4f4f' });
    //         unitPriceRangeEnd.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     } else {
    //         unitPriceRangeFrom.css({ backgroundColor: '#fff' });
    //         unitPriceRangeEnd.css({ backgroundColor: '#fff' });
    //     }
    //     if (isNaN(unitPriceRangeFrom.val()) || unitPriceRangeFrom.val() === '') {
    //         console.log(isNaN(unitPriceRangeFrom.val()));
    //         unitPriceRangeFrom.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     }
    //     if (isNaN(unitPriceRangeEnd.val()) || unitPriceRangeEnd.val() === '') {
    //         unitPriceRangeEnd.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     }
    // }

    // 交易總價
    // var totalPriceRangeFrom = $('#totalPriceRangeFrom');
    // var totalPriceRangeEnd = $('#totalPriceRangeEnd');
    // if (totalPriceRangeFrom.val() !== '' || totalPriceRangeEnd.val()) {
    //     if (parseFloat(totalPriceRangeFrom.val()) > parseFloat(totalPriceRangeEnd.val())) {
    //         console.log(totalPriceRangeFrom.val());
    //         console.log(totalPriceRangeEnd.val());
    //         totalPriceRangeFrom.css({ backgroundColor: '#ff4f4f' });
    //         totalPriceRangeEnd.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     } else {
    //         totalPriceRangeFrom.css({ backgroundColor: '#fff' });
    //         totalPriceRangeEnd.css({ backgroundColor: '#fff' });
    //     }
    //     if (isNaN(totalPriceRangeFrom.val()) || totalPriceRangeFrom.val() === '') {
    //         totalPriceRangeFrom.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     }
    //     if (isNaN(totalPriceRangeEnd.val()) || totalPriceRangeEnd.val() === '') {
    //         totalPriceRangeEnd.css({ backgroundColor: '#ff4f4f' });
    //         result = false;
    //     }
    // }
}

// 將地址轉為地理座標
function getGeocode(data, index) {
    // 屋齡
    var age = getAge(data[index].Col14.FDATE);
    // 行政區
    var district = data[index].Col2.DISTRICT;
    // 區段位置
    var location = data[index].Col4.LOCATION;
    // 單價
    var unitPrice = data[index].Col23.UPRICE;
    // Addresses need to be decode
    var search = '台北市' + district + location;
    var obj = {
        address: search, // 地址
        unitPrice: unitPrice, // 單價
        type: data[index].Col11.BUITYPE, // 型態
        soldDate: data[index].Col7.SDATE, // 交易年月
        totalPrice: data[index].Col22.TPRICE, // 總價
        totalFloors: data[index].Col10.TBUILD, // 樓高
        park: data[index].Col25.PARKTYPE, // 車位
        unit: data[index].Col5.LANDA, // 建坪
        age: age // 屋齡
    };
    // 地理編碼 - 將地址轉為地理座標
    geocoder.geocode({ address: search }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            var position = results[0].geometry.location;
            // Add markers to the map
            addMarker(search, position, unitPrice);
            // Create detail list of markers
            createList(obj);
        } else {
            // 如 request 太快，出現 OVER_QUERY_LIMIT，則重新 decode 並 delay
            if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                delay++;
                index--;
            } else {
                console.log("Geocode was not successful for the following reason: " + status);
            }
        }
        index++;
        if (index < addressLength) {
            setTimeout(function() {
                getGeocode(data, index);
            }, delay);
        }
    });
}

// Calculate age
function getAge(buildDateStr) {
    if (buildDateStr !== '') {
        var buildYear = parseInt(buildDateStr.slice(0, 3)) + 1911;
        var buildMonth = buildDateStr.slice(3, 5);
        var buildDate = buildDateStr.slice(5);
        var buildFullDate = new Date(buildYear, buildMonth - 1, buildDate);
        var diff = new Date(Date.now() - buildFullDate);
        return Math.round(diff / 31557600000 * 10) / 10;
    } else {
        return 0;
    }
}

// Add markers to the map
function addMarker(address, position, unitPrice) {
    var $estateList = $('.js--estate-list');
    var icon = {
        anchor: new google.maps.Point(0, 32),
        url: '../images/marker.png',
        scaledSize: new google.maps.Size(80, 32),
        labelOrigin: new google.maps.Point(40, 12)
    };
    var icon_mouseover = {
        anchor: new google.maps.Point(0, 32),
        url: '../images/marker_hover.png',
        scaledSize: new google.maps.Size(80, 32),
        labelOrigin: new google.maps.Point(40, 12)
    };

    var marker = new google.maps.Marker({
        map: map,
        position: position,
        icon: icon,
        label: {
            text: unitPrice + '萬',
            fontFamily: 'Microsoft JhengHei, Arial, Helvetica, sans-serif',
            color: '#fff'
        },
        title: address
    });
    // Marker mouseover event
    marker.addListener('mouseover', function() {
        marker.setIcon(icon_mouseover);
        $(':contains(' + this.getTitle() + ')').parent('li').addClass('hovered')
    });
    // Marker mouseout event
    marker.addListener('mouseout', function() {
        marker.setIcon(icon);
        $(':contains(' + this.getTitle() + ')').parent('li').removeClass('hovered')
    });
    // Marker click event
    marker.addListener('click', function() {
        // $('li.active').removeClass('active');
        var $li = $(':contains(' + this.getTitle() + ')').parent('li');
        // $li.addClass('active');
        var top = $li.position().top;
        // 第一個 li 的 position top
        var firstTop = $estateList.children('li:first').position().top;

        $estateList.stop().animate({
            scrollTop: top - firstTop
        }, 1000);
    });
    markers.push(marker);
}

// Create detail list of markers
function createList(obj) {
    var clone = document.getElementById('template-estate').content.cloneNode(true);
    clone.querySelector('.address').innerHTML = obj.address;
    clone.querySelector('.unitPrice').innerHTML = obj.unitPrice === '0' ? '--' : obj.unitPrice;
    clone.querySelector('.type').innerHTML = obj.type === '' ? '--' : obj.type;
    clone.querySelector('.soldDate').innerHTML = obj.soldDate.slice(0, 3) + '/' + obj.soldDate.slice(3, 5);
    clone.querySelector('.totalPrice').innerHTML = obj.totalPrice;
    clone.querySelector('.totalFloors').innerHTML = obj.totalFloors === '' ? '--' : parseInt(obj.totalFloors);
    clone.querySelector('.park').innerHTML = obj.park === '' ? '無' : '有';
    clone.querySelector('.unit').innerHTML = obj.unit === '0' ? '--' : obj.unit;
    clone.querySelector('.age').innerHTML = obj.age === 0 ? '--' : obj.age;
    var estateList = document.querySelector('.js--estate-list');
    estateList.appendChild(clone);
}

// Remove markers from the map
function clearMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    $('.js--estate-list li').remove();
}


// var cityDistrict = {
//     '基隆市': ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區'],
//     '台北市': ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
//     '新北市': ['萬里區', '金山區', '板橋區', '汐止區', '深坑區', '石碇區', '瑞芳區', '平溪區', '雙溪區', '貢寮區', '新店區', '坪林區', '烏來區', '永和區', '中和區', '土城區', '三峽區', '樹林區', '鶯歌區', '三重區', '新莊區', '泰山區', '林口區', '蘆洲區', '五股區', '新莊區', '八里區', '淡水區', '三芝區', '石門區'],
//     '桃園市': ['中壢區', '平鎮區', '龍潭區', '楊梅區', '新屋區', '觀音區', '桃園區', '龜山區', '八德區', '大溪區', '復興區', '大園區', '蘆竹區'],
//     '新竹市': ['北區', '東區', '香山區'],
//     '新竹縣': ['寶山鄉', '竹北市', '湖口鄉', '新豐鄉', '新埔鎮', '關西鎮', '芎林鄉', '寶山鄉', '竹東鎮', '五峰鄉', '橫山鄉', '尖石鄉', '北埔鄉', '峨眉鄉'],
//     '苗栗縣': ['竹南鎮', '頭份鎮', '三灣鄉', '南庄鄉', '獅潭鄉', '後龍鎮', '通霄鎮', '苑裡鎮', '苗栗市', '造橋鄉', '頭屋鄉', '公館鄉', '大湖鄉', '泰安鄉', '銅鑼鄉', '三義鄉', '西湖鄉', '卓蘭鎮'],
//     '台中市': ['中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區', '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區', '后里區', '石岡區', '東勢區', '和平區', '新社區', '潭子區', '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區', '清水區', '大甲區', '外埔區', '大安區'],
//     '南投縣': ['南投市', '中寮鄉', '草屯鎮', '國姓鄉', '埔里鎮', '仁愛鄉', '名間鄉', '集集鎮', '水里鄉', '魚池鄉', '信義鄉', '竹山鎮', '鹿谷鄉'],
//     '彰化縣': ['彰化市', '芬園鄉', '花壇鄉', '秀水鄉', '鹿港鎮', '福興鄉', '線西鄉', '和美鎮', '伸港鄉', '員林鎮', '社頭鄉', '永靖鄉', '埔心鄉', '溪湖鎮', '大村鄉', '埔鹽鄉', '田中鎮', '北斗鎮', '田尾鄉', '埤頭鄉', '溪州鄉', '竹塘鄉', '二林鎮', '大城鄉', '芳苑鄉', '二水鄉'],
//     '雲林縣': ['斗南鎮', '大埤鄉', '虎尾鎮', '土庫鎮', '褒忠鄉', '東勢鄉', '台西鄉', '崙背鄉', '麥寮鄉', '斗六市', '林內鄉', '古坑鄉', '莿桐鄉', '西螺鎮', '二崙鄉', '北港鎮', '水林鄉', '口湖鄉', '四湖鄉', '元長鄉'],
//     '嘉義市': ['西區', '東區'],
//     '嘉義縣': ['番路鄉', '梅山鄉', '竹崎鄉', '阿里山鄉', '中埔鄉', '大埔鄉', '水上鄉', '鹿草鄉', '太保市', '朴子市', '東石鄉', '六腳鄉', '新港鄉', '民雄鄉', '大林鎮', '溪口鄉', '義竹鄉', '布袋鎮'],
//     '台南市': ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '新市區', '大內區', '山上區', '新市區', '安定區'],
//     '高雄市': ['新興區', '前金區', '苓雅區', '鹽埕區', '鼓山區', '旗津區', '前鎮區', '三民區', '楠梓區', '小港區', '左營區', '仁武區', '大社區', '岡山區', '路竹區', '阿蓮區', '田寮區', '燕巢區', '橋頭區', '梓官區', '彌陀區', '永安區', '湖內區', '鳳山區', '大寮區', '林園區', '鳥松區', '大樹區', '旗山區', '美濃區', '六龜區', '內門區', '杉林區', '甲仙區', '桃源區', '那瑪夏區', '茂林區', '茄萣區'],
//     '屏東縣': ['屏東市', '三地門鄉', '霧台鄉', '瑪家鄉', '九如鄉', '里港鄉', '高樹鄉', '鹽埔鄉', '長治鄉', '麟洛鄉', '竹田鄉', '內埔鄉', '萬丹鄉', '潮州鎮', '泰武鄉', '來義鄉', '萬巒鄉', '崁頂鄉', '新埤鄉', '南州鄉', '林邊鄉', '東港鎮', '琉球鄉', '佳冬鄉', '新園鄉', '枋寮鄉', '枋山鄉', '春日鄉', '獅子鄉', '車城鄉', '牡丹鄉', '恆春鎮', '滿州鄉'],
//     '宜蘭縣': ['宜蘭市', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '羅東鎮', '三星鄉', '大同鄉', '五結鄉', '冬山鄉', '蘇澳鎮', '南澳鄉', '釣魚台'],
//     '花蓮縣': ['花蓮市', '新城鄉', '秀林鄉', '吉安鄉', '壽豐鄉', '鳳林鎮', '光復鄉', '豐濱鄉', '瑞穗鄉', '萬榮鄉', '玉里鎮', '卓溪鄉', '富里鄉'],
//     '台東縣': ['台東市', '綠島鄉', '蘭嶼鄉', '延平鄉', '卑南鄉', '鹿野鄉', '關山鎮', '海端鄉', '池上鄉', '東河鄉', '成功鎮', '長濱鄉', '太麻里鄉', '金峰鄉', '大武鄉', '達仁鄉'],
//     '澎湖縣': ['馬公市', '西嶼鄉', '望安鄉', '七美鄉', '白沙鄉', '湖西鄉'],
//     '金門縣': ['金沙鎮', '金湖鎮', '金寧鄉', '金城鎮', '烈嶼鄉', '烏坵鄉'],
//     '連江縣': ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉']
// };
