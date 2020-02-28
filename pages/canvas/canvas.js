// pages/canvas/canvas.js
import SignaturePad from '../../utils/signature_pad.js'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    canvas: null,
    signaturePad: new SignaturePad(),
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  handleTouchStart(event) {
    this.data.signaturePad.handleTouchStart(event)
  },

  handleTouchMove(event) {
    this.data.signaturePad.handleTouchMove(event)
  },

  handleTouchEnd(event) {
    this.data.signaturePad.handleTouchEnd(event)
  },

  handleSaveCanvas(event) {
    if (!this.data.canvas) return
    wx.canvasToTempFilePath({
      canvas: this.data.canvas,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: `${res.tempFilePath}`,
          success(res) {
            wx.showToast({
              title: '保存成功'
            })
          },
          fail(err) {
            wx.showToast({
              title: '保存失败'
            })
          }
        })
      }
    })
  },

  handleClearCanvas(event) {
    this.data.signaturePad.clear()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    const query = wx.createSelectorQuery()
    query.select('#myCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
    
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        this.data.signaturePad.init(canvas)
        this.setData({
          canvas: canvas,
        })
      })
    // const signaturePad = new SignaturePad(context)
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})