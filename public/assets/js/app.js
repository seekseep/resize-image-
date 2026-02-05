$(function () {
  'use strict';

  var imageEntries = [];
  var ratioW = 1;
  var ratioH = 1;

  // ステップ切り替え
  function showStep(step) {
    $('#step-select, #step-settings, #step-result').addClass('d-none');
    $('#step-' + step).removeClass('d-none');
    $('html, body').scrollTop(0);
  }

  // ファイル入力
  $('#file-input').on('change', function () {
    if (this.files && this.files.length) {
      loadImages(this.files);
    }
  });

  // ドラッグ＆ドロップ
  var $dropZone = $('#drop-zone');

  $dropZone.on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass('dragover');
  });

  $dropZone.on('dragleave drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('dragover');
  });

  $dropZone.on('drop', function (e) {
    var files = e.originalEvent.dataTransfer.files;
    if (files && files.length) {
      loadImages(files);
    }
  });

  $dropZone.on('click', function (e) {
    if ($(e.target).is('#file-input, label[for="file-input"]')) return;
    $('#file-input').trigger('click');
  });

  // 複数画像読み込み → Step 2 へ
  function loadImages(files) {
    imageEntries = [];
    $('#original-preview').empty();
    $('#result-list').empty();

    var validFiles = [];
    for (var i = 0; i < files.length; i++) {
      if (['image/jpeg', 'image/png', 'image/webp'].includes(files[i].type)) {
        validFiles.push(files[i]);
      }
    }

    if (validFiles.length === 0) {
      alert('対応していない形式です。JPEG、PNG、WebPのいずれかを選択してください。');
      return;
    }

    $('#image-count').text(validFiles.length);

    var loaded = 0;
    validFiles.forEach(function (file, index) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          imageEntries[index] = {
            img: img,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            dataURL: e.target.result
          };

          var $thumb = $('<img>')
            .addClass('thumb')
            .attr('src', e.target.result)
            .attr('alt', file.name)
            .attr('title', file.name + ' (' + img.width + 'x' + img.height + ')');
          $('#original-preview').append($thumb);

          loaded++;
          if (loaded === validFiles.length) {
            if (imageEntries[0]) {
              $('#input-width').val(imageEntries[0].img.width);
            }
            showStep('settings');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 画像を選び直す → Step 1 へ
  $('#back-to-select').on('click', function () {
    $('#file-input').val('');
    imageEntries = [];
    $('#original-preview').empty();
    $('#image-count').text('0');
    showStep('select');
  });

  // 比率プリセットボタン
  $('.ratio-btn').on('click', function () {
    $('.ratio-btn').removeClass('active');
    $(this).addClass('active');

    var ratio = $(this).data('ratio');
    if (ratio === 'custom') {
      $('#custom-ratio-group').removeClass('d-none');
      ratioW = parseInt($('#ratio-w').val(), 10) || 1;
      ratioH = parseInt($('#ratio-h').val(), 10) || 1;
    } else {
      var parts = ratio.split(':');
      ratioW = parseInt(parts[0], 10);
      ratioH = parseInt(parts[1], 10);
      $('#ratio-w').val(ratioW);
      $('#ratio-h').val(ratioH);
      $('#custom-ratio-group').addClass('d-none');
    }
  });

  $('#ratio-w, #ratio-h').on('input', function () {
    ratioW = parseInt($('#ratio-w').val(), 10) || 1;
    ratioH = parseInt($('#ratio-h').val(), 10) || 1;
  });

  $('#bg-color').on('input', function () {
    $('#bg-color-hex').text($(this).val());
  });

  $('#output-format').on('change', toggleQualitySlider);

  function toggleQualitySlider() {
    if ($('#output-format').val() === 'image/png') {
      $('#quality-group').addClass('d-none');
    } else {
      $('#quality-group').removeClass('d-none');
    }
  }

  $('#output-quality').on('input', function () {
    $('#quality-value').text($(this).val());
  });

  // リサイズ実行 → Step 3 へ
  $('#resize-form').on('submit', function (e) {
    e.preventDefault();

    if (imageEntries.length === 0) return;

    var canvasWidth = parseInt($('#input-width').val(), 10);
    if (!canvasWidth || canvasWidth < 1) {
      alert('有効な幅を入力してください。');
      return;
    }

    var canvasHeight = Math.round(canvasWidth * ratioH / ratioW);
    var bgColor = $('#bg-color').val();
    var format = $('#output-format').val();
    var quality = parseInt($('#output-quality').val(), 10) / 100;
    var ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

    showProcessing(true);
    $('#result-list').empty();

    setTimeout(function () {
      try {
        imageEntries.forEach(function (entry, index) {
          var result = resizeWithBackground(entry.img, canvasWidth, canvasHeight, bgColor);
          var dataURL = result.toDataURL(format, quality);

          var base64Length = dataURL.split(',')[1].length;
          var byteSize = Math.round((base64Length * 3) / 4);
          var baseName = entry.fileName.replace(/\.[^.]+$/, '');
          var downloadName = baseName + '_resized' + (ext[format] || '.jpg');

          var $item = $(
            '<div class="result-item border rounded p-3 mb-3">' +
              '<div class="d-flex align-items-start gap-3">' +
                '<div class="form-check pt-1">' +
                  '<input type="checkbox" class="form-check-input result-check" checked data-index="' + index + '">' +
                '</div>' +
                '<div class="flex-grow-1">' +
                  '<div class="result-img-wrap text-center mb-2">' +
                    '<img class="img-fluid rounded">' +
                  '</div>' +
                  '<p class="text-muted small mb-2"></p>' +
                  '<a class="btn btn-outline-primary btn-sm w-100 result-download" download>ダウンロード</a>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
          $item.find('img').attr('src', dataURL).attr('alt', entry.fileName);
          $item.find('p').text(
            entry.fileName + ' → ' +
            canvasWidth + ' x ' + canvasHeight + ' px / ' +
            formatFileSize(byteSize) + ' / ' + format
          );
          $item.find('.result-download').attr('href', dataURL).attr('download', downloadName);
          $item.data('dataurl', dataURL);
          $item.data('download-name', downloadName);

          $item.find('.result-img-wrap').on('click', function () {
            $('#preview-modal-title').text(entry.fileName);
            $('#preview-modal-image').attr('src', dataURL);
            $('#preview-modal-download').attr('href', dataURL).attr('download', downloadName);
            new bootstrap.Modal($('#preview-modal')[0]).show();
          });

          $('#result-list').append($item);
        });

        $('#select-all').prop('checked', true);
        showStep('result');
      } catch (err) {
        alert('リサイズ中にエラーが発生しました: ' + err.message);
      } finally {
        showProcessing(false);
      }
    }, 50);
  });

  // 設定に戻る → Step 2 へ
  $('#back-to-settings').on('click', function () {
    showStep('settings');
  });

  // 最初からやり直す → Step 1 へ
  $('#reselect-btn').on('click', function () {
    $('#file-input').val('');
    imageEntries = [];
    $('#original-preview').empty();
    $('#result-list').empty();
    $('#image-count').text('0');
    showStep('select');
  });

  // すべて選択
  $('#select-all').on('change', function () {
    $('.result-check').prop('checked', $(this).is(':checked'));
  });

  $(document).on('change', '.result-check', function () {
    var total = $('.result-check').length;
    var checked = $('.result-check:checked').length;
    $('#select-all').prop('checked', total === checked);
  });

  // 選択をダウンロード
  $('#download-selected').on('click', function () {
    $('.result-check:checked').each(function () {
      var $item = $(this).closest('.result-item');
      var $link = $('<a>')
        .attr('href', $item.data('dataurl'))
        .attr('download', $item.data('download-name'))
        .css('display', 'none');
      $('body').append($link);
      $link[0].click();
      $link.remove();
    });
  });

  // リサイズ処理
  function resizeWithBackground(img, canvasWidth, canvasHeight, bgColor) {
    var imgW = img.naturalWidth || img.width;
    var imgH = img.naturalHeight || img.height;

    var scale = Math.min(canvasWidth / imgW, canvasHeight / imgH);
    var drawW = Math.round(imgW * scale);
    var drawH = Math.round(imgH * scale);

    var resized = stepDownResize(img, drawW, drawH);

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvasWidth;
    finalCanvas.height = canvasHeight;

    var ctx = finalCanvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    var offsetX = Math.round((canvasWidth - drawW) / 2);
    var offsetY = Math.round((canvasHeight - drawH) / 2);
    ctx.drawImage(resized, offsetX, offsetY, drawW, drawH);

    return finalCanvas;
  }

  function stepDownResize(img, targetWidth, targetHeight) {
    var currentWidth = img.naturalWidth || img.width;
    var currentHeight = img.naturalHeight || img.height;
    var source = img;

    while (currentWidth / 2 > targetWidth || currentHeight / 2 > targetHeight) {
      var nextWidth = Math.max(Math.round(currentWidth / 2), targetWidth);
      var nextHeight = Math.max(Math.round(currentHeight / 2), targetHeight);

      var stepCanvas = document.createElement('canvas');
      stepCanvas.width = nextWidth;
      stepCanvas.height = nextHeight;

      var ctx = stepCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality !== undefined) {
        ctx.imageSmoothingQuality = 'high';
      }

      ctx.drawImage(source, 0, 0, nextWidth, nextHeight);

      source = stepCanvas;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;

    var finalCtx = finalCanvas.getContext('2d');
    finalCtx.imageSmoothingEnabled = true;
    if (finalCtx.imageSmoothingQuality !== undefined) {
      finalCtx.imageSmoothingQuality = 'high';
    }

    finalCtx.drawImage(source, 0, 0, targetWidth, targetHeight);

    return finalCanvas;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showProcessing(show) {
    if (show) {
      $('body').append(
        '<div id="processing-overlay">' +
          '<div class="text-center text-white">' +
            '<div class="spinner-border mb-2" role="status"></div>' +
            '<div>処理中...</div>' +
          '</div>' +
        '</div>'
      );
    } else {
      $('#processing-overlay').remove();
    }
  }
});
