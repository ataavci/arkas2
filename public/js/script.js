// add hovered class to selected list item
let list = document.querySelectorAll(".navigation li");

function activeLink() {
  list.forEach((item) => {
    item.classList.remove("hovered");
  });
  this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseover", activeLink));

// Menu Toggle
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('getDataButton').addEventListener('click', function() {
    fetch('/get-data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Sunucudan geçersiz yanıt');
        }
        return response.json();
      })
      .then(data => {
        let tableBody = document.getElementById('data-table');
        tableBody.innerHTML = ''; // Önce tabloyu temizle
        data.forEach(item => {
          let row = `<tr>
                      <td>${item.target}</td>
                      <td>${item.WtTship}</td>
                      <td>${item.TtWship}</td>
                      <td>${item.GHG_intensity}</td>
                      <td>${item.total_balance}</td>
                    </tr>`;
          tableBody.innerHTML += row;
        });
      })
      .catch(error => {
        console.error('Veri alınamadı:', error);
      });
  });
});

document.getElementById('emissionForm').addEventListener('submit', function(event) {
  event.preventDefault();

  // Form verilerini topla
  const formData = {
    vesselName: document.getElementById('vesselName').value,
    from: document.getElementById('from').value,
    to: document.getElementById('to').value,
    distance: document.getElementById('distance').value,
    hiz: document.getElementById('hiz').value,
    max_tuketim: document.getElementById('max_tuketim').value,
    port_kalan_sure: document.getElementById('port_kalan_sure').value,
    EUA_PRICE: document.getElementById('EUA_PRICE').value,
    fuel1Sea: document.getElementById('fuel1Sea').value,
    fuel2Port: document.getElementById('fuel2Port').value
  };

  // Verileri sunucuya gönder
  fetch('/calculate-emission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    // HTTP durum kodunu kontrol et
    if (!response.ok) {
      // Yanıtın text() formatında döndürülmesini kontrol et
      return response.text().then(text => {
        throw new Error(`Sunucu hatası: ${response.status}, Yanıt: ${text}`);
      });
    }
    return response.json(); // Yanıtı JSON'a dönüştür
  })
  .then(data => {
    const tableBody = document.querySelector('#resultTable tbody');
    tableBody.innerHTML = ''; // Önce tabloyu temizle

    // Sunucudan gelen verileri tabloya ekle
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.VESSEL_NAME}</td>
        <td>${row.from}</td>
        <td>${row.to}</td>
        <td>${row.status}</td>
        <td>${row.emission}</td>
        <td>${row.ets}</td>
        <td>${row.score}</td>
        <td>${row.kategori}</td>
      `;
      tableBody.appendChild(tr);
    });
  })
  .catch(error => {
    // Hata mesajını console'a yazdır
    console.error('Hata:', error.message);
    alert(`Hata oluştu: ${error.message}`);
  });
});

const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

allSideMenu.forEach(item=> {
	const li = item.parentElement;

	item.addEventListener('click', function () {
		allSideMenu.forEach(i=> {
			i.parentElement.classList.remove('active');
		})
		li.classList.add('active');
	})
});




// TOGGLE SIDEBAR
const menuBar = document.querySelector('#content nav .bx.bx-menu');
const sidebar = document.getElementById('sidebar');

menuBar.addEventListener('click', function () {
	sidebar.classList.toggle('hide');
})







const searchButton = document.querySelector('#content nav form .form-input button');
const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
const searchForm = document.querySelector('#content nav form');

searchButton.addEventListener('click', function (e) {
	if(window.innerWidth < 576) {
		e.preventDefault();
		searchForm.classList.toggle('show');
		if(searchForm.classList.contains('show')) {
			searchButtonIcon.classList.replace('bx-search', 'bx-x');
		} else {
			searchButtonIcon.classList.replace('bx-x', 'bx-search');
		}
	}
})





if(window.innerWidth < 768) {
	sidebar.classList.add('hide');
} else if(window.innerWidth > 576) {
	searchButtonIcon.classList.replace('bx-x', 'bx-search');
	searchForm.classList.remove('show');
}


window.addEventListener('resize', function () {
	if(this.innerWidth > 576) {
		searchButtonIcon.classList.replace('bx-x', 'bx-search');
		searchForm.classList.remove('show');
	}
})



const switchMode = document.getElementById('switch-mode');

switchMode.addEventListener('change', function () {
	if(this.checked) {
		document.body.classList.add('dark');
	} else {
		document.body.classList.remove('dark');
	}
})

function calculateOffset() {
    const water = parseFloat(document.getElementById('custom-water').value); // Su miktarını alıyoruz, parseFloat ile sayıya dönüştürüyoruz
    const electric = parseFloat(document.getElementById('custom-electric').value); // Mesafe bilgisini alıyoruz
    const gas = parseFloat(document.getElementById('custom-gas').value); // Emisyon faktörünü alıyoruz

    // Offset miktarını hesaplıyoruz (örnek bir hesaplama)
    const offsetQuantity = (water*0.4)+(electric*0.49) +(0.18*gas);

    // Sonucu HTML'e yazdırıyoruz
    document.getElementById('offsetResult').textContent = `Offset Quantity: ${offsetQuantity.toFixed(2)} tons CO₂`;

    // Bootstrap modalı gösteriyoruz
    var myModal = new bootstrap.Modal(document.getElementById('resultModal'));
    myModal.show();
}




