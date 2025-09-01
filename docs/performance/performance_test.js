#!/usr/bin/env node

/**
 * Frontend Performance Testing Script for Credit Card Processor
 * Tests build times, bundle size, development server performance
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { performance } from 'perf_hooks'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class FrontendPerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      buildPerformance: {},
      bundleAnalysis: {},
      developmentServer: {},
      dependencies: {},
    }
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`)
  }

  execCommand(command, cwd = process.cwd()) {
    try {
      const result = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000, // 5 minutes timeout
      })
      return { success: true, output: result.trim() }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout ? error.stdout.trim() : '',
        stderr: error.stderr ? error.stderr.trim() : '',
      }
    }
  }

  analyzeDependencies() {
    this.log('Analyzing package dependencies...')

    const packagePath = path.join(process.cwd(), 'package.json')
    const packageLockPath = path.join(process.cwd(), 'package-lock.json')

    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

      this.results.dependencies = {
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        totalDependencies: Object.keys({
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        }).length,
      }

      if (fs.existsSync(packageLockPath)) {
        const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
        this.results.dependencies.installedPackages = Object.keys(
          packageLock.dependencies || {}
        ).length
      }
    }
  }

  testBuildPerformance() {
    this.log('Testing production build performance...')

    // Clean previous build
    this.execCommand('rm -rf dist')

    const buildStart = performance.now()
    const buildResult = this.execCommand('npm run build')
    const buildEnd = performance.now()

    const buildTime = buildEnd - buildStart

    this.results.buildPerformance = {
      buildTime_ms: buildTime,
      buildTime_seconds: buildTime / 1000,
      buildSuccess: buildResult.success,
      buildOutput: buildResult.output,
      buildError: buildResult.error || null,
    }

    if (buildResult.success) {
      this.log(`✅ Build completed in ${(buildTime / 1000).toFixed(2)}s`)
    } else {
      this.log(`❌ Build failed: ${buildResult.error}`)
    }
  }

  analyzeBundleSize() {
    this.log('Analyzing bundle size and assets...')

    const distPath = path.join(process.cwd(), 'dist')

    if (!fs.existsSync(distPath)) {
      this.results.bundleAnalysis.error =
        'No dist directory found - build may have failed'
      return
    }

    const getDirectorySize = dirPath => {
      let totalSize = 0
      const files = []

      const walkDir = currentPath => {
        const items = fs.readdirSync(currentPath)

        for (const item of items) {
          const itemPath = path.join(currentPath, item)
          const stats = fs.statSync(itemPath)

          if (stats.isDirectory()) {
            walkDir(itemPath)
          } else {
            const relativePath = path.relative(distPath, itemPath)
            const size = stats.size
            totalSize += size

            files.push({
              path: relativePath,
              size_bytes: size,
              size_kb: (size / 1024).toFixed(2),
              type: path.extname(item),
            })
          }
        }
      }

      walkDir(dirPath)
      return { totalSize, files }
    }

    const { totalSize, files } = getDirectorySize(distPath)

    // Categorize files
    const filesByType = {}
    files.forEach(file => {
      const type = file.type || 'no-extension'
      if (!filesByType[type]) {
        filesByType[type] = { count: 0, totalSize: 0, files: [] }
      }
      filesByType[type].count++
      filesByType[type].totalSize += file.size_bytes
      filesByType[type].files.push(file)
    })

    this.results.bundleAnalysis = {
      totalSize_bytes: totalSize,
      totalSize_kb: (totalSize / 1024).toFixed(2),
      totalSize_mb: (totalSize / 1024 / 1024).toFixed(2),
      fileCount: files.length,
      filesByType,
      largestFiles: files
        .sort((a, b) => b.size_bytes - a.size_bytes)
        .slice(0, 10)
        .map(f => ({
          path: f.path,
          size_kb: f.size_kb,
          type: f.type,
        })),
    }

    this.log(
      `📦 Bundle size: ${this.results.bundleAnalysis.totalSize_kb} KB (${files.length} files)`
    )
  }

  testDevelopmentServer() {
    this.log('Testing development server startup performance...')

    // This test would be more complex in a real scenario
    // For now, we'll analyze the Vite configuration
    const viteConfigPath = path.join(process.cwd(), 'vite.config.js')

    if (fs.existsSync(viteConfigPath)) {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8')

      this.results.developmentServer = {
        configExists: true,
        hasProxy: viteConfig.includes('proxy'),
        hasHMR: viteConfig.includes('hmr') || true, // Vite has HMR by default
        port: viteConfig.match(/port:\s*(\d+)/)
          ? parseInt(viteConfig.match(/port:\s*(\d+)/)[1])
          : 3000,
        configAnalysis: {
          linesOfCode: viteConfig.split('\n').length,
          hasOptimizations:
            viteConfig.includes('build') &&
            viteConfig.includes('rollupOptions'),
        },
      }
    }

    // Test cold start time (simulated)
    const packageInstallStart = performance.now()
    const installResult = this.execCommand('npm list --depth=0')
    const packageInstallEnd = performance.now()

    this.results.developmentServer.packageListTime_ms =
      packageInstallEnd - packageInstallStart
    this.results.developmentServer.packageListSuccess = installResult.success
  }

  runLinting() {
    this.log('Running linting analysis...')

    const lintStart = performance.now()
    const lintResult = this.execCommand('npm run lint:check')
    const lintEnd = performance.now()

    this.results.linting = {
      lintTime_ms: lintEnd - lintStart,
      lintSuccess: lintResult.success,
      lintOutput: lintResult.output,
      lintError: lintResult.error || null,
    }

    if (lintResult.success) {
      this.log(
        `✅ Linting completed in ${((lintEnd - lintStart) / 1000).toFixed(2)}s`
      )
    } else {
      this.log(`⚠️  Linting issues found`)
    }
  }

  testTreeShaking() {
    this.log('Analyzing tree shaking effectiveness...')

    const mainJsPath = path.join(process.cwd(), 'src', 'main.js')
    const appVuePath = path.join(process.cwd(), 'src', 'App.vue')

    const sourceCodeAnalysis = {
      mainJsExists: fs.existsSync(mainJsPath),
      appVueExists: fs.existsSync(appVuePath),
      totalSourceFiles: 0,
      totalSourceSize: 0,
    }

    // Analyze source directory
    const srcPath = path.join(process.cwd(), 'src')
    if (fs.existsSync(srcPath)) {
      const analyzeDirectory = dir => {
        const items = fs.readdirSync(dir)

        items.forEach(item => {
          const itemPath = path.join(dir, item)
          const stats = fs.statSync(itemPath)

          if (stats.isDirectory()) {
            analyzeDirectory(itemPath)
          } else if (
            ['.js', '.vue', '.ts', '.jsx', '.tsx'].includes(path.extname(item))
          ) {
            sourceCodeAnalysis.totalSourceFiles++
            sourceCodeAnalysis.totalSourceSize += stats.size
          }
        })
      }

      analyzeDirectory(srcPath)
    }

    sourceCodeAnalysis.totalSourceSize_kb = (
      sourceCodeAnalysis.totalSourceSize / 1024
    ).toFixed(2)

    this.results.treeShaking = {
      sourceCodeAnalysis,
      bundleToSourceRatio: this.results.bundleAnalysis.totalSize_bytes
        ? (
            this.results.bundleAnalysis.totalSize_bytes /
            sourceCodeAnalysis.totalSourceSize
          ).toFixed(2)
        : 'N/A',
    }
  }

  generatePerformanceReport() {
    this.log('Generating performance report...')

    const report = {
      ...this.results,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations(),
    }

    // Save report
    const reportPath = path.join(
      process.cwd(),
      'frontend-performance-report.json'
    )
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Print summary
    console.log(`\n${'='.repeat(80)}`)
    console.log('FRONTEND PERFORMANCE SUMMARY REPORT')
    console.log('='.repeat(80))

    console.log(`Test completed at: ${this.results.timestamp}`)

    if (this.results.buildPerformance.buildSuccess) {
      console.log(
        `✅ Build Time: ${this.results.buildPerformance.buildTime_seconds.toFixed(2)}s`
      )
    } else {
      console.log(
        `❌ Build Failed: ${this.results.buildPerformance.buildError}`
      )
    }

    console.log(
      `📦 Bundle Size: ${this.results.bundleAnalysis.totalSize_kb} KB`
    )
    console.log(`📁 File Count: ${this.results.bundleAnalysis.fileCount}`)
    console.log(
      `📋 Dependencies: ${this.results.dependencies.totalDependencies} total`
    )

    if (this.results.linting) {
      const lintStatus = this.results.linting.lintSuccess
        ? '✅ PASS'
        : '⚠️  ISSUES'
      console.log(
        `🔍 Linting: ${lintStatus} (${(this.results.linting.lintTime_ms / 1000).toFixed(2)}s)`
      )
    }

    console.log('\nPerformance Targets:')
    console.log(
      `Build Time < 30s: ${this.results.buildPerformance.buildTime_seconds < 30 ? '✅ PASS' : '❌ FAIL'}`
    )
    console.log(
      `Bundle Size < 1MB: ${parseFloat(this.results.bundleAnalysis.totalSize_mb) < 1 ? '✅ PASS' : '❌ FAIL'}`
    )

    console.log(`\nDetailed report saved to: ${reportPath}`)

    return report
  }

  generateSummary() {
    const buildTimeScore =
      this.results.buildPerformance.buildTime_seconds < 10
        ? 100
        : this.results.buildPerformance.buildTime_seconds < 30
          ? 80
          : this.results.buildPerformance.buildTime_seconds < 60
            ? 60
            : 40

    const bundleSizeScore =
      parseFloat(this.results.bundleAnalysis.totalSize_mb) < 0.5
        ? 100
        : parseFloat(this.results.bundleAnalysis.totalSize_mb) < 1
          ? 80
          : parseFloat(this.results.bundleAnalysis.totalSize_mb) < 2
            ? 60
            : 40

    const dependencyScore =
      this.results.dependencies.totalDependencies < 20
        ? 100
        : this.results.dependencies.totalDependencies < 50
          ? 80
          : this.results.dependencies.totalDependencies < 100
            ? 60
            : 40

    const overallScore =
      (buildTimeScore + bundleSizeScore + dependencyScore) / 3

    return {
      buildTimeScore,
      bundleSizeScore,
      dependencyScore,
      overallScore: overallScore.toFixed(1),
      performanceGrade:
        overallScore >= 90
          ? 'A'
          : overallScore >= 80
            ? 'B'
            : overallScore >= 70
              ? 'C'
              : overallScore >= 60
                ? 'D'
                : 'F',
    }
  }

  generateRecommendations() {
    const recommendations = []

    if (this.results.buildPerformance.buildTime_seconds > 30) {
      recommendations.push({
        category: 'Build Performance',
        issue: 'Slow build time',
        recommendation:
          'Consider optimizing Vite configuration, reducing dependencies, or implementing code splitting',
        impact: 'High',
      })
    }

    if (parseFloat(this.results.bundleAnalysis.totalSize_mb) > 1) {
      recommendations.push({
        category: 'Bundle Size',
        issue: 'Large bundle size',
        recommendation:
          'Implement tree shaking, code splitting, and remove unused dependencies',
        impact: 'High',
      })
    }

    if (this.results.dependencies.totalDependencies > 100) {
      recommendations.push({
        category: 'Dependencies',
        issue: 'High dependency count',
        recommendation:
          'Audit and remove unnecessary dependencies, consider lighter alternatives',
        impact: 'Medium',
      })
    }

    if (
      this.results.bundleAnalysis.filesByType &&
      this.results.bundleAnalysis.filesByType['.js']
    ) {
      const jsSize =
        this.results.bundleAnalysis.filesByType['.js'].totalSize / 1024
      if (jsSize > 500) {
        recommendations.push({
          category: 'JavaScript Optimization',
          issue: 'Large JavaScript bundle',
          recommendation:
            'Implement dynamic imports and code splitting for better performance',
          impact: 'High',
        })
      }
    }

    return recommendations
  }

  async runFullPerformanceTest() {
    console.log('🚀 Starting Frontend Performance Assessment')
    console.log('='.repeat(80))

    try {
      this.analyzeDependencies()
      this.testDevelopmentServer()
      this.testBuildPerformance()

      if (this.results.buildPerformance.buildSuccess) {
        this.analyzeBundleSize()
        this.testTreeShaking()
      }

      this.runLinting()

      return this.generatePerformanceReport()
    } catch (error) {
      this.log(`❌ Performance test failed: ${error.message}`)
      throw error
    }
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new FrontendPerformanceTester()
  tester
    .runFullPerformanceTest()
    .then(report => {
      console.log('\n✅ Frontend performance test completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Frontend performance test failed:', error.message)
      process.exit(1)
    })
}

export default FrontendPerformanceTester
